import {
  saveSeries,
  saveCard,
  saveBooster,
  deleteSeries,
  deleteCard,
  inspectBoosterReferences,
  renameBoosterId,
  detachBoosterFromShop,
  safeDeleteBooster,
  uploadStudioAsset,
  uploadCardArtworkPair,
  deleteStudioAsset,
  storagePathFromUrl,
  saveBoosterSlot,
  simulateBoosterV91
} from "../content-studio-service.js";
import { validateBooster } from "../booster-config-validator.js";

export function createAdminBoosterEditors(context) {
  const {
    $, body, data, esc, openEditor, options, taxonomyOptions, subcategoryOptions,
    toggleControl, selectedValues, chipPicker, wireChipPicker, categoryName,
    subcategoryName, variantName, finishName, distributionName, say, reload, close
  } = context;

  function imageBlock(prefix, url, folder, label, filename = "") {
    const path = storagePathFromUrl(url),
      name = path
        ? path.split("/").pop()
        : url
          ? url.split("/").pop()
          : "No image selected";
    return `<div class="image-editor"><img id="${prefix}Preview" src="${esc(url || "site_assets/StarlightCard_Back_NewLogo.png")}" alt=""><div class="field"><label>${label} URL</label><input id="${prefix}Url" value="${esc(url || "")}"><label>Storage Filename</label><input id="${prefix}Filename" value="${esc(filename || name || "")}" placeholder="example.png"><label class="upload">Browse & Upload ${label}<input id="${prefix}File" type="file" accept="image/*"></label><div class="upload-meta" id="${prefix}Meta"><strong>${esc(name)}</strong>${path ? `Supabase Storage: ${esc(path)}<br><span class="asset-url">${esc(url)}</span>` : "Bundled site asset or external URL. Upload a replacement to store it in Supabase."}</div><button class="btn danger" type="button" id="${prefix}Delete" ${path ? "" : "disabled"}>Delete Uploaded Image</button></div></div>`;
  }
  function seriesEditor(s = {}) {
    openEditor(
      s.id ? "Edit Series" : "Create Series",
      `<div class="form-grid"><div class="field"><label>Series ID</label><input id="eSeriesId" value="${esc(s.id || "")}" ${s.id ? "readonly" : ""}></div><div class="field"><label>Series Name</label><input id="eSeriesName" value="${esc(s.name || "")}"></div><div class="field full"><label>Description</label><textarea id="eSeriesDescription">${esc(s.description || "")}</textarea></div><div class="field"><label>Sort Order</label><input id="eSeriesSort" type="number" value="${s.sortOrder || 0}"></div><div class="checks"><label><input id="eSeriesVisible" type="checkbox" ${s.isVisible !== false ? "checked" : ""}> Visible</label></div><div class="full">${imageBlock("eSeriesImage", s.boosterImageUrl || "site_assets/series01_rising_star_booster.png", "series", "Series Artwork")}</div></div><div class="editor-actions"><button id="saveSeries" class="btn primary">Save Series</button>${s.id ? '<button id="hideSeries" class="btn archive">Hide Series</button><button id="deleteSeries" class="btn danger">Delete Series</button>' : ""}</div>`,
    );
    wireUpload("eSeriesImage", "series");
    $("#saveSeries").onclick = async () => {
      try {
        await saveSeries({
          id: $("#eSeriesId").value,
          name: $("#eSeriesName").value,
          description: $("#eSeriesDescription").value,
          boosterImageUrl: $("#eSeriesImageUrl").value,
          sortOrder: Number($("#eSeriesSort").value),
          isVisible: $("#eSeriesVisible").checked,
        });
        await reload("Series saved. The live site catalog has been refreshed.");
      } catch (e) {
        say(e.message, "error");
      }
    };
    if (s.id) {
      $("#hideSeries").onclick = async () => {
        try {
          $("#eSeriesVisible").checked = false;
          $("#saveSeries").click();
        } catch (e) {
          say(e.message, "error");
        }
      };
      $("#deleteSeries").onclick = async () => {
        if (
          !(await StarlightUI.confirm({
            title: "Delete this series?",
            message:
              "Only an empty series can be deleted. This cannot be undone.",
            confirmText: "Delete Series",
            danger: true,
          }))
        )
          return;
        try {
          await deleteSeries(s.id);
          await reload(
            "Series deleted. The live site catalog has been refreshed.",
          );
        } catch (e) {
          say(e.message, "error");
        }
      };
    }
  }
  function nextCardDefaults(seriesId) {
    const cards = (data.cards || []).filter(
      (x) => String(x.seriesId) === String(seriesId),
    );
    const nums = cards
      .map((x) =>
        Number.parseInt(String(x.cardNumber || "").replace(/\D/g, ""), 10),
      )
      .filter(Number.isFinite);
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    const cardNumber = String(next).padStart(3, "0");
    const seriesRaw = String(seriesId || "").trim();
    const seriesNum = Number.parseInt(seriesRaw.replace(/\D/g, ""), 10);
    const prefix = Number.isFinite(seriesNum)
      ? `s${String(seriesNum).padStart(2, "0")}`
      : `s_${
          seriesRaw
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_|_$/g, "") || "series"
        }`;
    const base = `${prefix}_${cardNumber}`;
    return {
      cardNumber,
      id: base,
      sortOrder: next,
      frontFilename: `${base}.png`,
      thumbFilename: `${base}.png`,
      baseFilename: base,
    };
  }
  function safeStorageFilename(value, file) {
    const ext = (file?.name?.split(".").pop() || "png").toLowerCase();
    let name = String(value || "")
      .trim()
      .replace(/^.*[\\/]/, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-");
    if (!name) name = `image.${ext}`;
    if (!/\.[a-z0-9]+$/i.test(name)) name += `.${ext}`;
    return name.toLowerCase();
  }
  function cardEditor(c = {}) {
    const isNew = !c.id,
      initialSeries = c.seriesId || data.series?.[0]?.id || "",
      defaults = nextCardDefaults(initialSeries);
    const dateValue = (v) => (v ? new Date(v).toISOString().slice(0, 16) : "");
    openEditor(
      c.id ? "Edit Card" : "Add New Card",
      `<div class="wizard-steps"><span>1 Identity</span><span>2 Classification</span><span>3 Artwork</span><span>4 Distribution</span><span>5 Publish</span></div><div class="form-grid">${isNew ? `<div class="checks full auto-card-row"><label><input id="eCardAuto" type="checkbox" checked> Automatically assign the next card ID, number, sort order, and artwork filename for the selected series</label><small>Generated values remain editable when automatic assignment is turned off.</small></div>` : ""}<div class="field"><label>Card ID</label><input id="eCardId" value="${esc(c.id || defaults.id)}" ${c.id ? "readonly" : ""}></div><div class="field"><label>Series</label><select id="eCardSeries">${options(data.series, initialSeries)}</select></div><div class="field"><label>Card Number</label><input id="eCardNumber" value="${esc(c.cardNumber || defaults.cardNumber)}"></div><div class="field"><label>Collector Number</label><input id="eCollectorNumber" value="${esc(c.collectorNumber || c.cardNumber || defaults.cardNumber)}" placeholder="001/024 or 001"></div><div class="field full"><label>Card Name</label><input id="eCardName" value="${esc(c.name || "")}"></div><div class="field"><label>Category</label><select id="eCardCategory">${taxonomyOptions(data.categories, c.categoryId || "character", "Choose category")}</select></div><div class="field"><label>Subcategory / Franchise / Theme</label><select id="eCardSubcategory">${subcategoryOptions(c.subcategoryId || "")}</select><small>Independent from Category—for example, Outfit + Sonic The Hedgehog.</small></div><div class="field"><label>Rarity</label><select id="eCardRarity">${["Common", "Uncommon", "Rare", "Epic", "Legendary"].map((r) => `<option ${r === c.rarity ? "selected" : ""}>${r}</option>`).join("")}</select></div><div class="field"><label>Variant</label><select id="eCardVariant">${taxonomyOptions(data.variants, c.variantId || "standard-art", "Choose variant")}</select></div><div class="field"><label>Finish</label><select id="eCardFinish">${taxonomyOptions(data.finishes, c.finishId || "standard", "Choose finish")}</select></div><div class="field"><label>Artist / Illustrator</label><input id="eCardArtist" value="${esc(c.artist || "")}"></div><div class="field full"><label>Tags</label><input id="eCardTags" value="${esc((c.tags || []).join(", "))}" placeholder="Idol, Stardust, Transformation"><small>Separate tags with commas.</small></div><div class="field full"><label>Description / Flavor Text</label><textarea id="eCardDescription">${esc(c.description || "")}</textarea></div><div class="field"><label>Pull Frequency</label><select id="eCardFrequency"><option value="3">Very Common</option><option value="2">More Common</option><option value="1">Normal</option><option value="0.5">Less Common</option><option value="0.25">Very Limited</option><option value="0">Never Randomly Pulled</option><option value="custom">Advanced: Custom Weight</option></select><input id="eCardWeight" class="hidden" type="number" min="0" step=".01" value="${c.pullWeight ?? 1}"><small>Normal is recommended for nearly every standard card.</small></div><div class="field"><label>Sort Order</label><input id="eCardSort" type="number" value="${c.sortOrder || defaults.sortOrder}"></div><div class="field"><label>Distribution</label><select id="eDistribution"><option value="booster_pull">Booster Pull</option><option value="redeem_code">Redeem Code</option><option value="twitch_reward">Twitch Reward</option><option value="event_reward">Event Reward</option><option value="admin_gift">Admin Gift</option><option value="promo">Promo</option><option value="special">Special Distribution</option></select></div><div class="field"><label>Publish Status</label><select id="ePublishStatus"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div><div class="field"><label>Available From</label><input id="eAvailableFrom" type="datetime-local" value="${dateValue(c.availableFrom)}"></div><div class="field"><label>Available Until</label><input id="eAvailableUntil" type="datetime-local" value="${dateValue(c.availableUntil)}"></div><div class="checks full"><label><input id="eCardVisible" type="checkbox" ${c.isVisible !== false ? "checked" : ""}> Visible</label><label><input id="eCardCollectible" type="checkbox" ${c.isCollectible !== false ? "checked" : ""}> Collectible</label><label><input id="eCardPullable" type="checkbox" ${c.isPullable !== false ? "checked" : ""}> Pullable</label><label><input id="eCardPromo" type="checkbox" ${c.isPromo ? "checked" : ""}> Promo</label><label><input id="eCardEvent" type="checkbox" ${c.isEventExclusive ? "checked" : ""}> Event Exclusive</label></div><div class="full">${isNew ? `<div class="image-editor"><img id="eCardArtworkPreview" src="${esc(c.imageUrl || c.thumbnailUrl || "site_assets/StarlightCard_Back_NewLogo.png")}" alt=""><div class="field"><label>Card Artwork</label><input id="eCardArtworkUrl" value="${esc(c.imageUrl || "")}" readonly><label>Automatic Filename</label><input id="eCardArtworkFilename" value="${esc(defaults.frontFilename)}"><label class="upload">Browse & Upload Card Artwork<input id="eCardArtworkFile" type="file" accept="image/*"></label><div class="upload-meta" id="eCardArtworkMeta"><strong>One upload creates both files.</strong> Artwork is copied to card-fronts and thumbnails.</div></div></div>` : `<div>${imageBlock("eCardFront", c.imageUrl || "", "card-fronts", "Card Front")}</div><div>${imageBlock("eCardThumb", c.thumbnailUrl || c.imageUrl || "", "thumbnails", "Thumbnail")}</div>`}</div></div><div class="editor-actions"><button id="saveCard" class="btn primary">${isNew ? "Create Card" : "Save Card"}</button>${c.id ? '<button id="archiveCard" class="btn archive">Archive Card</button><button id="deleteCard" class="btn danger">Delete Card</button>' : ""}</div>`,
    );
    $("#eDistribution").value = c.distributionType || "booster_pull";
    $("#ePublishStatus").value = c.publishStatus || "published";
    const applyDefaults = () => {
      if (!isNew || !$("#eCardAuto")?.checked) return;
      const d = nextCardDefaults($("#eCardSeries").value);
      $("#eCardId").value = d.id;
      $("#eCardNumber").value = d.cardNumber;
      $("#eCollectorNumber").value = d.cardNumber;
      $("#eCardSort").value = d.sortOrder;
      if ($("#eCardArtworkFilename"))
        $("#eCardArtworkFilename").value = d.frontFilename;
    };
    if (isNew) {
      $("#eCardSeries").addEventListener("change", applyDefaults);
      $("#eCardAuto").addEventListener("change", () => {
        const locked = $("#eCardAuto").checked;
        ["#eCardId", "#eCardNumber", "#eCardSort"].forEach(
          (sel) => ($(sel).readOnly = locked),
        );
        if (locked) applyDefaults();
      });
      ["#eCardId", "#eCardNumber", "#eCardSort"].forEach(
        (sel) => ($(sel).readOnly = true),
      );
      const artworkFile = $("#eCardArtworkFile");
      artworkFile.onchange = async () => {
        const chosen = artworkFile.files?.[0];
        if (!chosen) return;
        const base = safeStorageFilename(
          $("#eCardArtworkFilename").value,
          chosen,
        ).replace(/\.[^.]+$/, "");
        $("#eCardArtworkMeta").textContent =
          "Uploading to card-fronts and thumbnails…";
        try {
          const uploaded = await uploadCardArtworkPair(chosen, base, {
            upsert: false,
          });
          $("#eCardArtworkUrl").value = uploaded.frontUrl;
          $("#eCardArtworkUrl").dataset.thumbnailUrl = uploaded.thumbnailUrl;
          $("#eCardArtworkPreview").src = uploaded.frontUrl;
          $("#eCardArtworkMeta").innerHTML =
            `<strong>${esc(uploaded.filename)}</strong><code>${esc(uploaded.frontPath)}</code><br><code>${esc(uploaded.thumbnailPath)}</code>`;
          say("Artwork uploaded.", "success");
        } catch (e) {
          $("#eCardArtworkMeta").textContent = e.message;
          say(e.message, "error");
        }
      };
    } else {
      wireUpload("eCardFront", "card-fronts");
      wireUpload("eCardThumb", "thumbnails");
    }
    const known = ["3", "2", "1", "0.5", "0.25", "0"],
      current = String(c.pullWeight ?? 1);
    $("#eCardFrequency").value = known.includes(current) ? current : "custom";
    const syncFreq = () => {
      $("#eCardWeight").classList.toggle(
        "hidden",
        $("#eCardFrequency").value !== "custom",
      );
      if ($("#eCardFrequency").value !== "custom")
        $("#eCardWeight").value = $("#eCardFrequency").value;
    };
    $("#eCardFrequency").onchange = syncFreq;
    syncFreq();
    $("#saveCard").onclick = async () => {
      try {
        if (!$("#eCardId").value.trim() || !$("#eCardNumber").value.trim())
          throw new Error("Card ID and number are required.");
        await saveCard({
          id: $("#eCardId").value.trim(),
          seriesId: $("#eCardSeries").value,
          cardNumber: $("#eCardNumber").value.trim(),
          collectorNumber: $("#eCollectorNumber").value.trim(),
          name: $("#eCardName").value,
          categoryId: $("#eCardCategory").value,
          subcategoryId: $("#eCardSubcategory").value || null,
          rarity: $("#eCardRarity").value,
          variantId: $("#eCardVariant").value,
          finishId: $("#eCardFinish").value,
          artist: $("#eCardArtist").value,
          tags: $("#eCardTags")
            .value.split(",")
            .map((x) => x.trim())
            .filter(Boolean),
          description: $("#eCardDescription").value,
          distributionType: $("#eDistribution").value,
          isPromo: $("#eCardPromo").checked,
          isEventExclusive: $("#eCardEvent").checked,
          availableFrom: $("#eAvailableFrom").value
            ? new Date($("#eAvailableFrom").value).toISOString()
            : null,
          availableUntil: $("#eAvailableUntil").value
            ? new Date($("#eAvailableUntil").value).toISOString()
            : null,
          publishStatus: $("#ePublishStatus").value,
          pullWeight: Number($("#eCardWeight").value),
          sortOrder: Number($("#eCardSort").value),
          isVisible: $("#eCardVisible").checked,
          isCollectible: $("#eCardCollectible").checked,
          isPullable: $("#eCardPullable").checked,
          imageUrl: isNew
            ? $("#eCardArtworkUrl").value
            : $("#eCardFrontUrl").value,
          thumbnailUrl: isNew
            ? $("#eCardArtworkUrl").dataset.thumbnailUrl ||
              $("#eCardArtworkUrl").value
            : $("#eCardThumbUrl").value || $("#eCardFrontUrl").value,
        });
        await reload("Card saved and catalog refreshed.");
      } catch (e) {
        say(e.message, "error");
      }
    };
    if (c.id) {
      $("#archiveCard").onclick = () => {
        $("#ePublishStatus").value = "archived";
        $("#eCardVisible").checked = false;
        $("#eCardPullable").checked = false;
        $("#saveCard").click();
      };
      $("#deleteCard").onclick = async () => {
        if (
          !(await StarlightUI.confirm({
            title: "Delete this card?",
            message: "Owned or referenced cards must be archived instead.",
            confirmText: "Delete Card",
            danger: true,
          }))
        )
          return;
        try {
          await deleteCard(c.id);
          await reload("Card deleted.");
        } catch (e) {
          say(e.message, "error");
        }
      };
    }
  }
  
  function rewardRows(b) {
    return (b.rewardCards || []).map((r, i) => rewardRow(r, i)).join("");
  }
  function rewardRow(r = {}, i = 0) {
    return `<div class="reward-row" data-reward-row><div class="field"><label>Card</label><select data-card>${options(data.cards, r.cardId, (c) => `#${c.cardNumber} ${c.name}`)}</select></div><div class="field"><label>Quantity</label><input data-qty type="number" min="1" value="${r.quantity || 1}"></div><div class="field"><label>Weight</label><input data-weight type="number" min="0" step=".01" value="${r.weight ?? 1}"></div><button class="btn danger" data-remove-reward>Remove</button></div>`;
  }
  function slotsHtml(b) {
    const rows = b.slots || [];
    if (!rows.length) return '<p class="lead">This pack has no rarity slots yet. Start from a Standard Pack template or copy an existing booster.</p>';
    return rows.map((s) => `
      <article class="v91-slot-card" data-slot="${s.id || ''}" data-slot-key="${esc(s.slotKey || `slot_${s.id || 1}`)}" data-slot-sort="${Number(s.sortOrder)||0}">
        <div class="v91-slot-head">
          <div class="field">
            <label>Slot Name</label>
            <input data-slot-name value="${esc(s.name)}">
          </div>
          <div class="field v91-slot-quantity">
            <label>Cards From This Slot</label>
            <input data-slot-qty type="number" min="1" max="20" value="${Number(s.quantity)||1}">
          </div>
          <span class="rate-total" data-rate-total>Calculating…</span>
        </div>
        <div class="v91-rate-list">
          ${["Common","Uncommon","Rare","Epic","Legendary"].map(r => {
            const value = Number(s.rates?.[r] || 0);
            return `<div class="v91-rate-row" data-rate-row="${r}">
              <label>${r}</label>
              <input class="v91-rate-range" data-rate-range="${r}" type="range" min="0" max="100" step="1" value="${value}">
              <div class="v91-rate-number"><input data-rate="${r}" type="number" min="0" max="100" step="1" value="${value}"><span>%</span></div>
            </div>`;
          }).join("")}
        </div>
      </article>
    `).join("");
  }
  function boosterEditor(
    b = {
      rewardMode: "slots",
      builderMode: "guided",
      oddsPreset: "standard",
      packImageUrl: "site_assets/series01_rising_star_booster.png",
      cardBackUrl: "site_assets/StarlightCard_Back_NewLogo.png",
      cardCount: 4,
      rewardCards: [],
      slots: [],
      categoryIds: [],
      finishIds: [],
      excludePromos: true,
      allowDuplicates: true,
    },
  ) {
    openEditor(
      b.id ? "Configure Booster Pack" : "Create Booster Pack",
      `<div class="booster-builder-head"><div><span class="taxonomy-chip">Booster Builder</span><h3>Build a reliable pack without guesswork</h3><p>Choose a pack structure, set the Rare-or-Better odds, then validate or simulate it before activation.</p></div><div class="toggle-card"><div><strong>Advanced Mode</strong><small>Show raw slot percentages.</small></div><label class="toggle-switch"><input id="advancedBuilder" type="checkbox" ${b.builderMode === "advanced" ? "checked" : ""}><span></span></label></div></div><div class="form-grid"><div class="field"><label>Booster ID</label><input id="eBoosterId" value="${esc(b.id || "")}" ${b.id ? "readonly" : ""}></div><div class="field"><label>Name</label><input id="eBoosterName" value="${esc(b.name || "")}"></div><div class="field full"><label>Description</label><textarea id="eBoosterDescription">${esc(b.description || "")}</textarea></div><div class="field"><label>What does this pack award?</label><select id="eRewardMode"><option value="slots">Cards using rarity odds</option><option value="series">Random cards from one series</option><option value="exact">Exact selected cards</option><option value="weighted_pool">Custom selected card pool</option><option value="single">One exact card</option><option value="mixed">Cards + Star Bits</option></select></div><div class="field"><label>Restrict to Series</label><select id="eBoosterSeries"><option value="">All series</option>${options(data.series, b.seriesId)}</select></div><div class="field"><label>Cards Per Pack</label><input id="eBoosterCount" type="number" min="1" max="50" value="${b.cardCount || 4}"></div><div class="field"><label>Default Pull-Rate Preset</label><select id="oddsPreset"><option value="standard">Standard — Rare 80%, Epic 18%, Legendary 2%</option><option value="generous">Generous — Rare 72%, Epic 23%, Legendary 5%</option><option value="premium">Premium — Rare 60%, Epic 30%, Legendary 10%</option><option value="custom">Custom / Keep Current</option></select></div><div class="field full"><label>Optional Category Filters</label>${chipPicker("boosterCategories", data.categories || [], b.categoryIds || [])}<small>Leave everything cleared to allow every category.</small></div><div class="field full"><label>Optional Finish Filters</label>${chipPicker("boosterFinishes", data.finishes || [], b.finishIds || [])}<small>Leave everything cleared to allow every finish.</small></div><div class="field"><label>Bonus Star Bits</label><input id="eBoosterBits" type="number" min="0" value="${b.bonusStarBits || 0}"></div><div class="field"><label>Star Bits Cost</label><input id="eBoosterCost" type="number" min="0" value="${b.starBitsCost || 0}"></div><div class="field"><label>Sort Order</label><input id="eBoosterSort" type="number" value="${b.sortOrder || 0}"></div><div class="toggle-grid full">${toggleControl("excludePromos","Exclude promotional cards",b.excludePromos !== false,"Promo cards will not appear in this pack.")}${toggleControl("allowDuplicates","Allow duplicates in one pack",b.allowDuplicates !== false,"The same card may be pulled more than once.")}${toggleControl("eBoosterActive","Active / Visible",b.isActive,"Collectors can see and use this booster where eligible.")}${toggleControl("eBoosterArchived","Archived",b.archived,"Keep the record but hide it from normal use.")}</div><div>${imageBlock("ePackImage", b.packImageUrl, "booster-packs", "Pack Artwork")}</div><div>${imageBlock("eBackImage", b.cardBackUrl, "card-backs", "Card Back")}</div></div><div id="guidedOdds" class="reward-builder"><h3>Rare-or-Better Preset</h3><p class="lead">A normal four-card pack uses 2 Common, 1 Uncommon, and 1 Rare-or-Better. Standard keeps Legendary pulls genuinely special.</p><div class="preset-cards"><button type="button" class="template-choice" data-easy-preset="standard"><strong>Standard</strong><span>Rare 80 · Epic 18 · Legendary 2</span></button><button type="button" class="template-choice" data-easy-preset="generous"><strong>Generous</strong><span>Rare 72 · Epic 23 · Legendary 5</span></button><button type="button" class="template-choice" data-easy-preset="premium"><strong>Premium</strong><span>Rare 60 · Epic 30 · Legendary 10</span></button></div></div><details id="slotBuilder" class="reward-builder v91-odds-details" ${b.builderMode === "advanced" ? "open" : ""}><summary><span><strong>Edit Exact Pull Rates</strong><small>Optional. Every slot must total exactly 100%.</small></span></summary><div class="toolbar"><button id="balanceSlots" class="btn" type="button">Balance Current Slots</button></div>${slotsHtml(b)}</details><div class="reward-builder"><h3>Pack Preview</h3><pre id="boosterPreview" class="odds-summary plain-preview"></pre></div><div id="rewardBuilder" class="reward-builder"><div class="toolbar"><div><h3>Exact Cards / Custom Pool</h3></div><button id="addReward" class="btn">＋ Add Card</button></div><div id="rewardRows">${rewardRows(b)}</div></div><section class="reward-builder v91-validation-panel"><div><h3>Validate Before Going Live</h3><p class="lead">Save your changes, then simulate openings to confirm the results look right.</p></div><div class="v91-sim-controls"><select id="simulationCount"><option value="100">100 openings</option><option value="1000" selected>1,000 openings</option><option value="10000">10,000 openings</option></select><button id="simulateBooster" class="btn" type="button" ${b.id ? "" : "disabled"}>Simulate Pack</button></div><div id="simulationResults" class="v91-simulation-results">Simulation does not award cards or spend Star Bits.</div></section><div class="editor-actions"><button id="saveBooster" class="btn primary">Save Booster Pack</button>${b.id ? '<button id="copyThisBooster" class="btn">Copy Booster</button><button id="inspectBooster" class="btn">Inspect References</button><button id="renameBooster" class="btn">Rename Booster ID</button><button id="detachBooster" class="btn archive">Detach From Card Shop</button><button id="archiveBooster" class="btn archive">Archive Booster</button><button id="deleteBooster" class="btn danger">Delete Booster Safely</button>' : ""}</div>`,
    );
    $("#eRewardMode").value = b.rewardMode || "slots";
    $("#oddsPreset").value = b.oddsPreset || "standard";
    wireUpload("ePackImage", "booster-packs");
    wireUpload("eBackImage", "card-backs");
    wireChipPicker("boosterCategories", updatePreview);
    wireChipPicker("boosterFinishes", updatePreview);
    const applyPreset = (name) => {
      const vals =
        name === "premium"
          ? [60, 30, 10]
          : name === "generous"
            ? [72, 23, 5]
            : [80, 18, 2];
      body.querySelectorAll("[data-slot]").forEach((row) => {
        const f = Object.fromEntries(
          [...row.querySelectorAll("[data-rate]")].map((x) => [
            x.dataset.rate,
            x,
          ]),
        );
        const rarePlus =
          (Number(f.Rare?.value) || 0) +
            (Number(f.Epic?.value) || 0) +
            (Number(f.Legendary?.value) || 0) >
          0;
        if (rarePlus) {
          f.Common.value = 0;
          f.Uncommon.value = 0;
          f.Rare.value = vals[0];
          f.Epic.value = vals[1];
          f.Legendary.value = vals[2];
        }
      });
      $("#oddsPreset").value = name;
      updatePreview();
    };
    body
      .querySelectorAll("[data-easy-preset]")
      .forEach((x) => (x.onclick = () => applyPreset(x.dataset.easyPreset)));
    $("#oddsPreset").onchange = () => {
      if ($("#oddsPreset").value !== "custom")
        applyPreset($("#oddsPreset").value);
    };
    const toggle = () => {
      const m = $("#eRewardMode").value,
        advanced = $("#advancedBuilder").checked;
      $("#slotBuilder").classList.toggle("hidden", m !== "slots");
      $("#guidedOdds").classList.toggle("hidden", m !== "slots");
      $("#rewardBuilder").classList.toggle(
        "hidden",
        !["exact", "weighted_pool", "single", "mixed"].includes(m),
      );
      $("#eBoosterCount").disabled = !["series", "weighted_pool"].includes(m);
      $("#eBoosterBits").disabled = m !== "mixed";
    };
    $("#advancedBuilder").onchange = toggle;
    $("#eRewardMode").onchange = () => {
      toggle();
      updatePreview();
    };
    toggle();
    body.querySelectorAll("[data-rate-row]").forEach((row) => {
      const range = row.querySelector("[data-rate-range]");
      const number = row.querySelector("[data-rate]");
      if (!range || !number) return;
      range.oninput = () => { number.value = range.value; updateTotals(); updatePreview(); };
      number.oninput = () => { range.value = Math.max(0, Math.min(100, Number(number.value)||0)); updateTotals(); updatePreview(); };
    });
    const updateTotals = () =>
      body.querySelectorAll("[data-slot]").forEach((row) => {
        const total = [...row.querySelectorAll("[data-rate]")].reduce(
            (n, x) => n + (Number(x.value) || 0),
            0,
          ),
          out = row.querySelector("[data-rate-total]");
        if (out) {
          out.textContent = `Total: ${total}% ${Math.abs(total - 100) < 0.001 ? "✓" : "— must equal 100%"}`;
          out.className = `rate-total ${Math.abs(total - 100) < 0.001 ? "good" : "bad"}`;
        }
      });
    function updatePreview() {
      const mode = $("#eRewardMode").value,
        cats = selectedValues($("#boosterCategories")).map(categoryName),
        finishes = selectedValues($("#boosterFinishes")).map(finishName);
      let text = `${$("#eBoosterName").value || "Untitled Booster"}
  
  `;
      if (mode === "slots") {
        const rows = [...body.querySelectorAll("[data-slot]")];
        text += `${rows.reduce((n, r) => n + (Number(r.querySelector("[data-slot-qty]").value) || 0), 0)} cards per pack.
  `;
        rows.forEach((r) => {
          const odds = [...r.querySelectorAll("[data-rate]")]
            .map((x) => [x.dataset.rate, Number(x.value) || 0])
            .filter((x) => x[1] > 0)
            .map((x) => `${x[0]} ${x[1]}%`)
            .join(", ");
          text += `• ${r.querySelector("[data-slot-name]").value}: ${r.querySelector("[data-slot-qty]").value} — ${odds}
  `;
        });
      } else if (mode === "series")
        text += `${$("#eBoosterCount").value} random cards from ${data.series.find((s) => s.id === $("#eBoosterSeries").value)?.name || "the selected series"}.
  `;
      else
        text += `${friendlyRewardMode(mode)} with ${body.querySelectorAll("[data-reward-row]").length} configured card entries.
  `;
      if ($("#eBoosterSeries").value && mode === "slots")
        text += `Series restriction: ${data.series.find((s) => s.id === $("#eBoosterSeries").value)?.name}.
  `;
      if (cats.length)
        text += `Categories: ${cats.join(", ")}.
  `;
      if (finishes.length)
        text += `Finishes: ${finishes.join(", ")}.
  `;
      text += `${$("#excludePromos").checked ? "Promos excluded." : "Promos allowed."} ${$("#allowDuplicates").checked ? "Duplicates may appear." : "No duplicate card in the same pack."}
  Shop price: ${$("#eBoosterCost").value || 0} Star Bits`;
      $("#boosterPreview").textContent = text;
      updateTotals();
    }
    body.addEventListener("input", (e) => {
      if (
        e.target.matches(
          "[data-rate],[data-slot-qty],#eBoosterName,#eBoosterCount,#eBoosterCost,#eBoosterSeries,#boosterCategories,#boosterFinishes,#excludePromos,#allowDuplicates",
        )
      )
        updatePreview();
    });
    $("#balanceSlots")?.addEventListener("click", () => {
      body.querySelectorAll("[data-slot]").forEach((row) => {
        const inputs = [...row.querySelectorAll("[data-rate]")],
          active = inputs.filter((x) => (Number(x.value) || 0) > 0),
          targets = active.length ? active : inputs.slice(0, 1);
        inputs.forEach(
          (x) =>
            (x.value = targets.includes(x)
              ? (100 / targets.length).toFixed(2)
              : 0),
        );
        const total = targets.reduce((n, x) => n + Number(x.value), 0);
        targets[targets.length - 1].value = (
          Number(targets[targets.length - 1].value) +
          (100 - total)
        ).toFixed(2);
      });
      $("#oddsPreset").value = "custom";
      updatePreview();
    });
    updatePreview();
    $("#addReward").onclick = () =>
      $("#rewardRows").insertAdjacentHTML("beforeend", rewardRow({}, Date.now()));
    body.onclick = async (e) => {
      const rem = e.target.closest("[data-remove-reward]");
      if (rem) rem.closest("[data-reward-row]").remove();
      const save = e.target.closest("[data-save-slot]");
      if (save) {
        const row = save.closest("[data-slot]"),
          rates = {};
        row
          .querySelectorAll("[data-rate]")
          .forEach((x) => (rates[x.dataset.rate] = Number(x.value) || 0));
        try {
          await saveBoosterSlot(
            row.dataset.slot,
            row.querySelector("[data-slot-qty]").value,
            rates,
          );
          say("Slot saved.", "success");
        } catch (err) {
          say(err.message, "error");
        }
      }
    };
    $("#simulateBooster")?.addEventListener("click", async () => {
      const button = $("#simulateBooster");
      const output = $("#simulationResults");
      try {
        button.disabled = true;
        button.textContent = "Simulating…";
        output.textContent = "Opening virtual packs…";
        const result = await simulateBoosterV91(b.id, Number($("#simulationCount").value)||1000);
        const counts = result?.rarityCounts || {};
        const totalCards = Object.values(counts).reduce((n,v)=>n+(Number(v)||0),0) || 1;
        const order = ["Common","Uncommon","Rare","Epic","Legendary"];
        output.innerHTML = `<strong>${Number(result.openings).toLocaleString()} virtual pack openings</strong><div class="v91-sim-grid">${order.map(r => {
          const count = Number(counts[r]||0);
          const pct = (count/totalCards*100).toFixed(2);
          return `<div class="v91-sim-stat rarity-${r.toLowerCase()}"><span>${r}</span><strong>${pct}%</strong><small>${count.toLocaleString()} cards</small></div>`;
        }).join("")}</div>`;
      } catch (error) {
        output.textContent = error.message || "Unable to simulate this booster.";
        output.classList.add("error");
      } finally {
        button.disabled = false;
        button.textContent = "Simulate Pack";
      }
    });
  
    const formatSaveError = (err) => {
      if (!err) return "Unable to save booster.";
      if (typeof err === "string") return err;
      return err.message || err.details || err.hint || String(err);
    };
    const editorSay = (message, type = "") => {
      let el = $("#editorStatus");
      if (!el) {
        el = document.createElement("p");
        el.id = "editorStatus";
        el.setAttribute("role", "status");
        body.prepend(el);
      }
      el.textContent = message;
      el.className = `status ${type}`.trim();
      say(message, type);
      if (type === "error") window.StarlightUI?.toast?.(message, "error");
    };
    $("#saveBooster").onclick = async () => {
      const saveButton = $("#saveBooster");
      try {
        const rewardCards = [...body.querySelectorAll("[data-reward-row]")].map(
          (row, i) => ({
            cardId: row.querySelector("[data-card]")?.value || "",
            quantity: Number(row.querySelector("[data-qty]")?.value) || 1,
            weight: Number(row.querySelector("[data-weight]")?.value) || 0,
            guaranteed: true,
            sortOrder: i,
          }),
        );
        const invalid = [...body.querySelectorAll("[data-slot]")].some(
          (row) =>
            Math.abs(
              [...row.querySelectorAll("[data-rate]")].reduce(
                (n, x) => n + (Number(x.value) || 0),
                0,
              ) - 100,
            ) > 0.001,
        );
        if ($("#eRewardMode").value === "slots" && invalid)
          throw new Error("Every rarity slot must total 100%.");
        const slots = [...body.querySelectorAll("[data-slot]")].map((row,index) => {
          const rates = {};
          row.querySelectorAll("[data-rate]").forEach((x) => {
            rates[x.dataset.rate] = Number(x.value) || 0;
          });
          return {
            id: Number(row.dataset.slot) || null,
            slotKey: row.dataset.slotKey || `slot_${index + 1}`,
            name: row.querySelector("[data-slot-name]")?.value || `Slot ${index + 1}`,
            quantity: Number(row.querySelector("[data-slot-qty]")?.value) || 1,
            sortOrder: Number(row.dataset.slotSort) || index * 10,
            rates
          };
        });
        if (saveButton) {
          saveButton.disabled = true;
          saveButton.textContent = "Saving…";
        }
        editorSay("Saving booster pack…");
        const payload = {
          id: $("#eBoosterId").value,
          name: $("#eBoosterName").value,
          description: $("#eBoosterDescription").value,
          rewardMode: $("#eRewardMode").value,
          seriesId: $("#eBoosterSeries").value || null,
          cardCount: Number($("#eBoosterCount").value) || 1,
          bonusStarBits: Number($("#eBoosterBits").value) || 0,
          starBitsCost: Number($("#eBoosterCost").value) || 0,
          sortOrder: Number($("#eBoosterSort").value) || 0,
          isActive: $("#eBoosterActive").checked,
          archived: $("#eBoosterArchived").checked,
          packImageUrl: $("#ePackImageUrl").value,
          cardBackUrl: $("#eBackImageUrl").value,
          rewardCards,
          builderMode: $("#advancedBuilder").checked ? "advanced" : "guided",
          oddsPreset: $("#oddsPreset").value,
          categoryIds: selectedValues($("#boosterCategories")),
          finishIds: selectedValues($("#boosterFinishes")),
          excludePromos: $("#excludePromos").checked,
          allowDuplicates: $("#allowDuplicates").checked,
          slots,
        };
        const validation = validateBooster(payload, { cards: data.cards });
        if (!validation.valid) throw new Error(validation.errors.map(error => error.message).join(" "));
        await saveBooster(payload, slots);
        await reload("Booster pack saved successfully.");
        window.StarlightUI?.toast?.("Booster pack saved successfully.", "success");
      } catch (err) {
        console.error("[Starlight] Booster save failed:", err);
        editorSay(formatSaveError(err), "error");
      } finally {
        if (saveButton?.isConnected) {
          saveButton.disabled = false;
          saveButton.textContent = "Save Booster Pack";
        }
      }
    };
    if (b.id) {
      $("#copyThisBooster").onclick = () => copyBoosterDialog(b.id);
      $("#inspectBooster").onclick = async () => {
        try {
          const report = await inspectBoosterReferences(b.id);
          const refs = report.references || [];
          openEditor("Booster Reference Inspector", `<p class="lead"><strong>${esc(b.name)}</strong> uses ID <code>${esc(b.id)}</code>.</p><div class="reference-report">${refs.length ? refs.map(r=>`<div class="reference-row"><span><strong>${esc(r.table)}</strong><br><small>${esc(r.column)} · ${esc(r.onDelete || "restrict")}</small></span><strong>${Number(r.count)||0}</strong></div>`).join("") : '<p>No foreign-key references were found.</p>'}</div><p class="lead">JSON metadata and historical text references are also repaired by the Rename Booster ID tool.</p><div class="editor-actions"><button id="closeReferenceReport" class="btn primary">Done</button></div>`);
          $("#closeReferenceReport").onclick = close;
        } catch (e) { say(e.message, "error"); }
      };
      $("#renameBooster").onclick = async () => {
        openEditor("Rename Booster ID", `<p class="lead">This safely creates the new booster ID, repoints database references, repairs known metadata links, and removes the old ID.</p><div class="form-grid"><div class="field"><label>Current ID</label><input value="${esc(b.id)}" disabled></div><div class="field"><label>New Booster ID</label><input id="renameBoosterId" value="${esc(b.id)}"></div><div class="field full"><label>Booster Name</label><input id="renameBoosterName" value="${esc(b.name)}"></div></div><div class="editor-actions"><button id="confirmRenameBooster" class="btn primary">Rename & Repair References</button></div>`);
        $("#confirmRenameBooster").onclick = async () => {
          try {
            const newId = $("#renameBoosterId").value.trim();
            if (!newId || newId === b.id) throw new Error("Enter a different booster ID.");
            if (!(await StarlightUI.confirm({title:"Rename booster ID?",message:`Change ${b.id} to ${newId} and update all references?`,confirmText:"Rename Booster"}))) return;
            await renameBoosterId(b.id,newId,$("#renameBoosterName").value);
            await reload(`Booster ID renamed to ${newId}.`);
          } catch (e) { say(e.message, "error"); }
        };
      };
      $("#detachBooster").onclick = async () => {
        try {
          if (!(await StarlightUI.confirm({title:"Detach from Card Shop?",message:"This sets the Star Bits price to 0 and disables the booster so it no longer appears as a purchasable shop pack.",confirmText:"Detach Booster"}))) return;
          await detachBoosterFromShop(b.id);
          await reload("Booster detached from the Card Shop.");
        } catch(e){ say(e.message,"error"); }
      };
      $("#archiveBooster").onclick = () => {
        $("#eBoosterArchived").checked = true;
        $("#eBoosterActive").checked = false;
        $("#saveBooster").click();
      };
      $("#deleteBooster").onclick = async () => {
        if (
          !(await StarlightUI.confirm({
            title: "Delete this booster?",
            message: "This permanently removes the booster only when no protected references remain. Use Inspect References first if it fails.",
            confirmText: "Delete Booster",
            danger: true,
          }))
        )
          return;
        const deleteButton = $("#deleteBooster");
        try {
          deleteButton.disabled = true;
          deleteButton.textContent = "Deleting…";
          await safeDeleteBooster(b.id);
          await reload("Booster permanently deleted.");
        } catch (e) {
          console.error("[Starlight] Booster deletion failed:", e);
          say(e.message || "Unable to delete booster.", "error");
          deleteButton.disabled = false;
          deleteButton.textContent = "Delete Booster Safely";
        }
      };
    }
  }
  
  function bulkCardUploadEditor() {
    const firstSeries = data.series?.[0]?.id || "";
    openEditor(
      "Mass Upload Card Set",
      `<div class="form-grid"><div class="field"><label>Destination Series</label><select id="bulkSeries">${options(data.series, firstSeries)}</select></div><div class="field"><label>Default Category</label><select id="bulkCategory">${taxonomyOptions(data.categories, "character", "Choose category")}</select></div><div class="field"><label>Default Rarity</label><select id="bulkRarity">${["Common", "Uncommon", "Rare", "Epic", "Legendary"].map((r) => `<option>${r}</option>`).join("")}</select></div><div class="field full"><label>Select Card Artwork Files</label><input id="bulkFiles" type="file" accept="image/*" multiple><small>There is no site-imposed file-count limit. Files are processed in filename order and each image is copied to both card-fronts and thumbnails.</small></div><div class="field full"><label>Artist (optional)</label><input id="bulkArtist"></div><div class="field full"><label>Description template (optional)</label><textarea id="bulkDescription" placeholder="Applied to every imported card."></textarea></div></div><div id="bulkPreview" class="panel-soft">Choose a series and one or more images to preview generated IDs.</div><div class="editor-actions"><button id="startBulkUpload" class="btn primary">Upload & Create Cards</button></div>`,
    );
    const preview = () => {
      const files = [...($("#bulkFiles").files || [])].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true }),
      );
      const base = nextCardDefaults($("#bulkSeries").value);
      $("#bulkPreview").innerHTML = files.length
        ? `<strong>${files.length} card${files.length === 1 ? "" : "s"} ready</strong><ol>${files
            .slice(0, 100)
            .map((f, i) => {
              const n = String(Number(base.cardNumber) + i).padStart(3, "0");
              const seriesNum = Number.parseInt(
                String($("#bulkSeries").value).replace(/\D/g, ""),
                10,
              );
              const prefix = Number.isFinite(seriesNum)
                ? `s${String(seriesNum).padStart(2, "0")}`
                : "s_series";
              return `<li>${esc(f.name)} → <code>${prefix}_${n}</code></li>`;
            })
            .join(
              "",
            )}</ol>${files.length > 100 ? `<p>…and ${files.length - 100} more</p>` : ""}`
        : "Choose one or more images.";
    };
    $("#bulkFiles").onchange = preview;
    $("#bulkSeries").onchange = preview;
    $("#startBulkUpload").onclick = async () => {
      const files = [...($("#bulkFiles").files || [])].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true }),
      );
      if (!files.length) throw new Error("Choose at least one image.");
      const seriesId = $("#bulkSeries").value,
        defaults = nextCardDefaults(seriesId),
        results = [];
      $("#startBulkUpload").disabled = true;
      for (let i = 0; i < files.length; i++) {
        const file = files[i],
          num = String(Number(defaults.cardNumber) + i).padStart(3, "0");
        const seriesNum = Number.parseInt(
          String(seriesId).replace(/\D/g, ""),
          10,
        );
        const prefix = Number.isFinite(seriesNum)
          ? `s${String(seriesNum).padStart(2, "0")}`
          : "s_series";
        const id = `${prefix}_${num}`;
        say(`Importing ${i + 1} of ${files.length}: ${id}…`);
        try {
          const uploaded = await uploadCardArtworkPair(file, id, {
            upsert: false,
          });
          await saveCard({
            id,
            seriesId,
            cardNumber: num,
            name: file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "),
            rarity: $("#bulkRarity").value,
            artist: $("#bulkArtist").value,
            description: $("#bulkDescription").value,
            pullWeight: 1,
            sortOrder: Number(num),
            isVisible: true,
            isCollectible: true,
            isPullable: true,
            imageUrl: uploaded.frontUrl,
            thumbnailUrl: uploaded.thumbnailUrl,
          });
          results.push({ id, ok: true });
        } catch (error) {
          results.push({ id, ok: false, error: error.message || String(error) });
        }
      }
      $("#startBulkUpload").disabled = false;
      const failed = results.filter((r) => !r.ok);
      await reload(
        `Mass upload completed: ${results.length - failed.length} created${failed.length ? `, ${failed.length} failed` : ""}.`,
      );
      if (failed.length)
        window.StarlightUI?.toast?.(
          `${failed.length} card${failed.length === 1 ? "" : "s"} failed. Check naming conflicts or Storage permissions.`,
          "error",
        );
    };
  }
  
  function wireUpload(prefix, folder, options = {}) {
    const file = $(`#${prefix}File`),
      url = $(`#${prefix}Url`),
      preview = $(`#${prefix}Preview`),
      meta = $(`#${prefix}Meta`),
      del = $(`#${prefix}Delete`),
      filename = $(`#${prefix}Filename`);
    const refresh = () => {
      const path = storagePathFromUrl(url.value),
        name = path
          ? path.split("/").pop()
          : url.value
            ? url.value.split("/").pop()
            : "No image selected";
      preview.src = url.value || "site_assets/StarlightCard_Back_NewLogo.png";
      if (filename && path) filename.value = name;
      meta.innerHTML = `<strong>${esc(name)}</strong>${path ? `Supabase Storage: ${esc(path)}<br><span class="asset-url">${esc(url.value)}</span>` : "Bundled site asset or external URL. Upload a replacement to store it in Supabase."}`;
      del.disabled = !path;
    };
    url.oninput = refresh;
    file.onchange = async () => {
      const chosen = file.files?.[0];
      if (!chosen) return;
      const targetPath =
        typeof options.path === "function" ? options.path(chosen) : options.path;
      meta.innerHTML = `<strong>${esc(chosen.name)}</strong>Will upload as <code>${esc(targetPath || `${folder}/generated-name`)}</code>…`;
      del.disabled = true;
      try {
        const uploaded = await uploadStudioAsset(chosen, folder, {
          path: targetPath,
          upsert: false,
        });
        url.value = uploaded.url;
        preview.src = uploaded.url;
        if (filename) filename.value = uploaded.path.split("/").pop();
        meta.innerHTML = `<strong>${esc(uploaded.path.split("/").pop())}</strong>Uploaded to <code>${esc(uploaded.path)}</code><br><span class="asset-url">${esc(uploaded.url)}</span>`;
        del.disabled = false;
        say(
          "Artwork uploaded to Supabase Storage. Save the item to keep this URL.",
          "success",
        );
      } catch (e) {
        meta.innerHTML = `<strong>${esc(chosen.name)}</strong>${esc(e.message || "Upload failed.")}`;
        say(e.message, "error");
      }
    };
    del.onclick = async () => {
      const path = storagePathFromUrl(url.value);
      if (
        !path ||
        !(await StarlightUI.confirm({
          title: "Delete uploaded image?",
          message:
            "This removes the image from Supabase Storage. Choose a replacement before saving if the content still needs artwork.",
          confirmText: "Delete Image",
          danger: true,
        }))
      )
        return;
      try {
        await deleteStudioAsset(path);
        url.value = "";
        file.value = "";
        refresh();
        say(
          "Uploaded image deleted. Choose a replacement and save the item.",
          "success",
        );
      } catch (e) {
        say(e.message, "error");
      }
    };
    refresh();
  }

  return { seriesEditor, cardEditor, boosterEditor, bulkCardUploadEditor };
}

