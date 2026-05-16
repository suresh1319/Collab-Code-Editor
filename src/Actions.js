const ACTIONS = {
    JOIN:'join',
    JOINED:'joined',
    DISCONNECTED:'disconnected',
    CODE_CHANGE:'code-change',
    SYNC_CODE:'sync_code',
    LEAVE:'leave',
    TOGGLE_PERMISSION: 'toggle_permission',
    PERMISSION_CHANGED: 'permission_changed',
    REQUEST_WRITE_ACCESS: 'request_write_access',
    WRITE_ACCESS_REQUESTED: 'write_access_requested',
    // File system actions
    FS_SYNC: 'fs_sync',
    FS_CREATE_NODE: 'fs_create_node',
    FS_DELETE_NODE: 'fs_delete_node',
    FS_RENAME_NODE: 'fs_rename_node',
    FS_UPLOAD_BATCH: 'fs_upload_batch',
};

module.exports = ACTIONS;