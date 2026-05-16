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
    APPROVE_CODE_EDIT: 'approve_code_edit',
    DENY_CODE_EDIT: 'deny_code_edit',
    // File system actions
    FS_SYNC: 'fs_sync',
    FS_CREATE_NODE: 'fs_create_node',
    FS_DELETE_NODE: 'fs_delete_node',
    FS_RENAME_NODE: 'fs_rename_node',
    // Uploads: sends nodes + file contents in one batch so content syncs to all collaborators
    FS_UPLOAD_BATCH: 'fs_upload_batch',
    // Edit Requests
    REQUEST_CODE_EDIT: 'request_code_edit',
    RECEIVE_CODE_EDIT: 'receive_code_edit',
};

module.exports = ACTIONS;