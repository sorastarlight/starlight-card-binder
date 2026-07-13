import { supabase } from './supabase-client.js';

export async function getMyStaffAccess() {
    const { data, error } = await supabase.rpc('get_my_staff_access');
    if (error) throw error;
    return data || { isStaff: false, role: null };
}

export async function listStaffUsers() {
    const { data, error } = await supabase.rpc('admin_list_staff_users');
    if (error) throw error;
    return data || [];
}

export async function setStaffRole(userId, role) {
    const { data, error } = await supabase.rpc('admin_set_staff_role', {
        requested_user_id: userId,
        requested_role: role
    });
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
