import { supabase } from './supabase-client.js';

function isUnauthenticatedStaffLookup(error) {
    const message = String(error?.message || error?.code || '').toLowerCase();
    return (
        error?.code === 'PGRST301' ||
        error?.code === '42501' ||
        /permission denied|not authenticated|jwt|unauthorized|login required/.test(message)
    );
}

export async function getMyStaffAccess() {
    const { data, error } = await supabase.rpc('get_my_staff_access');
    if (error) {
        // RPC is granted to authenticated only; signed-out collectors are not staff.
        if (isUnauthenticatedStaffLookup(error)) {
            return { isStaff: false, role: null, roleLabel: null };
        }
        throw error;
    }
    return data || { isStaff: false, role: null, roleLabel: null };
}

export async function listStaffUsers() {
    const { data, error } = await supabase.rpc('admin_list_staff_users');
    if (error) throw error;
    return data || [];
}

export async function listStaffRoleLabels() {
    const { data, error } = await supabase.rpc('admin_list_staff_role_labels');
    if (error) throw error;
    return data || [];
}

export async function createStaffRoleLabel(name, permissionTier) {
    const { data, error } = await supabase.rpc('admin_create_staff_role_label', {
        requested_name: name,
        requested_permission_tier: permissionTier
    });
    if (error) throw error;
    return data;
}

export async function deleteStaffRoleLabel(labelId) {
    const { data, error } = await supabase.rpc('admin_delete_staff_role_label', {
        requested_label_id: labelId
    });
    if (error) throw error;
    return data;
}

export async function setStaffRole(userId, role, labelId = null) {
    const payload = {
        requested_user_id: userId,
        requested_role: labelId ? null : role,
        requested_label_id: labelId || null
    };
    const { data, error } = await supabase.rpc('admin_set_staff_role', payload);
    if (error) throw error;
    return data;
}

export async function removeStaffRole(userId) {
    const { data, error } = await supabase.rpc('admin_remove_staff_role', {
        requested_user_id: userId
    });
    if (error) throw error;
    return data;
}

export async function listStaffAuditLog(limit = 100) {
    const { data, error } = await supabase.rpc('admin_list_staff_audit_log', {
        requested_limit: limit
    });
    if (error) throw error;
    return data || [];
}

export async function listUserUnlockables(userId) {
    const { data, error } = await supabase.rpc('admin_list_user_unlockables', {
        requested_user_id: userId
    });
    if (error) throw error;
    return data || null;
}

export async function grantUserUnlockable(userId, kind, unlockId) {
    const { data, error } = await supabase.rpc('admin_grant_user_unlockable', {
        requested_user_id: userId,
        unlock_kind: kind,
        unlock_id: unlockId
    });
    if (error) throw error;
    return data;
}

export async function revokeUserUnlockable(userId, kind, unlockId) {
    const { data, error } = await supabase.rpc('admin_revoke_user_unlockable', {
        requested_user_id: userId,
        unlock_kind: kind,
        unlock_id: unlockId
    });
    if (error) throw error;
    return data;
}

export async function setUserUnlockables(userId, titleIds = [], frameIds = []) {
    const { data, error } = await supabase.rpc('admin_set_user_unlockables', {
        requested_user_id: userId,
        requested_title_ids: titleIds,
        requested_frame_ids: frameIds
    });
    if (error) throw error;
    return data;
}
