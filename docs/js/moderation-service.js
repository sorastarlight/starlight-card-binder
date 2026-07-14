import { supabase } from './supabase-client.js';

export async function submitProfileReport(username, category, details) {
    const { data, error } = await supabase.rpc('submit_profile_report', {
        requested_username: username,
        requested_category: category,
        requested_details: details
    });
    if (error) throw error;
    return data;
}

export async function listProfileReports(status = 'open', limit = 100) {
    const { data, error } = await supabase.rpc('staff_list_profile_reports', {
        requested_status: status,
        requested_limit: limit
    });
    if (error) throw error;
    return data || [];
}

export async function updateProfileReport(reportId, status, resolutionNote = '') {
    const { data, error } = await supabase.rpc('staff_update_profile_report', {
        requested_report_id: reportId,
        requested_status: status,
        requested_resolution_note: resolutionNote
    });
    if (error) throw error;
    return data;
}

export async function setProfileModeration(userId, hidden, editLocked, reason = '') {
    const { data, error } = await supabase.rpc('staff_set_profile_moderation', {
        requested_user_id: userId,
        requested_hidden: hidden,
        requested_edit_locked: editLocked,
        requested_reason: reason
    });
    if (error) throw error;
    return data;
}
