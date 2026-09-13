const kdbxweb = require('kdbxweb');
const hashWasm = require('hash-wasm');
const fs = require('fs');
const path = require('path');

// Configure Argon2 implementation for kdbxweb (supports KDBX v4 Argon2d and Argon2id)
kdbxweb.CryptoEngine.setArgon2Impl(async (password, salt, memory, iterations, length, parallelism, type, version) => {
    const fn = type === kdbxweb.CryptoEngine.Argon2TypeArgon2d ? hashWasm.argon2d : hashWasm.argon2id;
    const res = await fn({
        password: new Uint8Array(password),
        salt: new Uint8Array(salt),
        iterations,
        memorySize: memory,
        parallelism,
        hashLength: length,
        outputType: 'binary'
    });
    return res.buffer.slice(res.byteOffset, res.byteOffset + res.byteLength);
});

class KdbxService {
    constructor() {
        this.currentDb = null;
        this.currentFilePath = null;
        this.hasUnsavedChanges = false;
    }

    /**
     * Helper to safely read field string / protected value
     */
    getFieldValue(val) {
        if (!val) return '';
        if (typeof val === 'string') return val;
        if (typeof val.getText === 'function') return val.getText();
        return String(val);
    }

    /**
     * Finds an entry by UUID string
     */
    findEntry(uuidStr) {
        if (!this.currentDb) return null;
        for (const entry of this.currentDb.getDefaultGroup().allEntries()) {
            if (entry.uuid && entry.uuid.id === uuidStr) {
                return entry;
            }
        }
        return null;
    }

    /**
     * Open an existing KDBX database
     */
    async openDatabase(filePath, password, keyFilePath = null) {
        const resolvedPath = path.resolve(filePath);
        if (!fs.existsSync(resolvedPath)) {
            throw new Error(`Arquivo não encontrado: ${resolvedPath}`);
        }

        const fileBuffer = fs.readFileSync(resolvedPath);
        const arrayBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength);

        const protectedPassword = password !== undefined && password !== null
            ? kdbxweb.ProtectedValue.fromString(password)
            : null;

        let keyFileBuffer = null;
        if (keyFilePath && fs.existsSync(keyFilePath)) {
            const kf = fs.readFileSync(keyFilePath);
            keyFileBuffer = kf.buffer.slice(kf.byteOffset, kf.byteOffset + kf.byteLength);
        }

        const credentials = new kdbxweb.Credentials(protectedPassword, keyFileBuffer);
        await credentials.ready;

        try {
            this.currentDb = await kdbxweb.Kdbx.load(arrayBuffer, credentials);
            this.currentFilePath = resolvedPath;
            this.hasUnsavedChanges = false;

            return this.getDatabaseData();
        } catch (err) {
            if (err && (err.code === kdbxweb.Consts.ErrorCodes.InvalidKey || err.message?.includes('invalid key'))) {
                throw new Error('Senha incorreta ou arquivo chave inválido.');
            }
            if (err && err.code === kdbxweb.Consts.ErrorCodes.BadSignature) {
                throw new Error('O arquivo não é uma base de dados KeePass válida (assinatura inválida).');
            }
            throw new Error(`Erro ao abrir banco: ${err.message || err}`);
        }
    }

    /**
     * Create a new KDBX database
     */
    async createDatabase(filePath, dbName, password, keyFilePath = null) {
        const resolvedPath = path.resolve(filePath);

        const protectedPassword = password
            ? kdbxweb.ProtectedValue.fromString(password)
            : null;

        let keyFileBuffer = null;
        if (keyFilePath && fs.existsSync(keyFilePath)) {
            const kf = fs.readFileSync(keyFilePath);
            keyFileBuffer = kf.buffer.slice(kf.byteOffset, kf.byteOffset + kf.byteLength);
        }

        const credentials = new kdbxweb.Credentials(protectedPassword, keyFileBuffer);
        await credentials.ready;

        const db = kdbxweb.Kdbx.create(credentials, dbName || 'Minhas Senhas');
        this.currentDb = db;
        this.currentFilePath = resolvedPath;

        // Save immediately to create the file
        const savedBuffer = await db.save();
        fs.writeFileSync(resolvedPath, Buffer.from(savedBuffer));
        this.hasUnsavedChanges = false;

        return this.getDatabaseData();
    }

    /**
     * Save the active database to disk
     */
    async saveDatabase(targetPath = null) {
        if (!this.currentDb) {
            throw new Error('Nenhum banco de dados aberto.');
        }

        const savePath = targetPath ? path.resolve(targetPath) : this.currentFilePath;
        if (!savePath) {
            throw new Error('Caminho do arquivo não especificado.');
        }

        const buffer = await this.currentDb.save();
        const tmpPath = `${savePath}.tmp`;
        const bakPath = `${savePath}.bak`;

        // Create backup if original exists
        if (fs.existsSync(savePath)) {
            try {
                fs.copyFileSync(savePath, bakPath);
            } catch (e) {
                console.warn('Não foi possível criar backup antes de salvar:', e);
            }
        }

        // Atomic write
        fs.writeFileSync(tmpPath, Buffer.from(buffer));
        fs.renameSync(tmpPath, savePath);

        this.currentFilePath = savePath;
        this.hasUnsavedChanges = false;

        return {
            success: true,
            filePath: savePath
        };
    }

    /**
     * Returns structured database information (meta, groups, entries)
     */
    getDatabaseData() {
        if (!this.currentDb) {
            return null;
        }

        const rootGroup = this.currentDb.getDefaultGroup();

        const serializeGroup = (group) => {
            return {
                id: group.uuid.id,
                name: group.name || 'Sem nome',
                icon: group.icon,
                entriesCount: group.entries.length,
                subgroups: (group.groups || []).map(g => serializeGroup(g))
            };
        };

        const flatGroups = [];
        const collectGroups = (group, depth = 0) => {
            flatGroups.push({
                id: group.uuid.id,
                name: group.name || 'Sem nome',
                depth: depth,
                isRoot: group === rootGroup,
                isRecycleBin: this.currentDb.meta.recycleBinUuid && group.uuid.equals(this.currentDb.meta.recycleBinUuid)
            });
            for (const sub of (group.groups || [])) {
                collectGroups(sub, depth + 1);
            }
        };
        collectGroups(rootGroup, 0);

        const allEntries = [];
        for (const entry of rootGroup.allEntries()) {
            const title = this.getFieldValue(entry.fields.get('Title'));
            const username = this.getFieldValue(entry.fields.get('UserName'));
            const password = this.getFieldValue(entry.fields.get('Password'));
            const url = this.getFieldValue(entry.fields.get('URL'));
            const notes = this.getFieldValue(entry.fields.get('Notes'));

            allEntries.push({
                id: entry.uuid.id,
                groupId: entry.parentGroup ? entry.parentGroup.uuid.id : null,
                groupName: entry.parentGroup ? entry.parentGroup.name : 'Geral',
                title: title,
                username: username,
                password: password,
                url: url,
                notes: notes,
                tags: entry.tags || [],
                lastModified: entry.times?.lastModificationTime
                    ? entry.times.lastModificationTime.toISOString()
                    : null
            });
        }

        return {
            filePath: this.currentFilePath,
            fileName: this.currentFilePath ? path.basename(this.currentFilePath) : 'Banco de Dados',
            hasUnsavedChanges: this.hasUnsavedChanges,
            rootGroup: serializeGroup(rootGroup),
            flatGroups: flatGroups,
            entries: allEntries
        };
    }

    /**
     * Add a new entry to a group
     */
    addEntry({ groupId, title, username, password, url, notes }) {
        if (!this.currentDb) throw new Error('Nenhum banco aberto.');

        let targetGroup = null;
        if (groupId) {
            targetGroup = this.currentDb.getGroup(groupId);
        }
        if (!targetGroup) {
            targetGroup = this.currentDb.getDefaultGroup();
        }

        const entry = this.currentDb.createEntry(targetGroup);
        entry.fields.set('Title', title || 'Nova Entrada');
        entry.fields.set('UserName', username || '');
        entry.fields.set('Password', kdbxweb.ProtectedValue.fromString(password || ''));
        entry.fields.set('URL', url || '');
        entry.fields.set('Notes', notes || '');
        entry.times.update();

        this.hasUnsavedChanges = true;
        return this.getDatabaseData();
    }

    /**
     * Update an existing entry
     */
    updateEntry(uuidStr, { groupId, title, username, password, url, notes }) {
        if (!this.currentDb) throw new Error('Nenhum banco aberto.');

        const entry = this.findEntry(uuidStr);
        if (!entry) throw new Error(`Entrada não encontrada com id: ${uuidStr}`);

        entry.pushHistory();
        entry.fields.set('Title', title || '');
        entry.fields.set('UserName', username || '');
        entry.fields.set('Password', kdbxweb.ProtectedValue.fromString(password || ''));
        entry.fields.set('URL', url || '');
        entry.fields.set('Notes', notes || '');
        entry.times.update();

        // Move group if changed
        if (groupId && entry.parentGroup && entry.parentGroup.uuid.id !== groupId) {
            const targetGroup = this.currentDb.getGroup(groupId);
            if (targetGroup) {
                this.currentDb.move(entry, targetGroup);
            }
        }

        this.hasUnsavedChanges = true;
        return this.getDatabaseData();
    }

    /**
     * Delete an entry
     */
    deleteEntry(uuidStr) {
        if (!this.currentDb) throw new Error('Nenhum banco aberto.');

        const entry = this.findEntry(uuidStr);
        if (!entry) throw new Error(`Entrada não encontrada com id: ${uuidStr}`);

        this.currentDb.remove(entry);
        this.hasUnsavedChanges = true;
        return this.getDatabaseData();
    }

    /**
     * Add a new group
     */
    addGroup(parentGroupId, name) {
        if (!this.currentDb) throw new Error('Nenhum banco aberto.');

        let parentGroup = null;
        if (parentGroupId) {
            parentGroup = this.currentDb.getGroup(parentGroupId);
        }
        if (!parentGroup) {
            parentGroup = this.currentDb.getDefaultGroup();
        }

        this.currentDb.createGroup(parentGroup, name || 'Novo Grupo');
        this.hasUnsavedChanges = true;
        return this.getDatabaseData();
    }

    /**
     * Delete a group
     */
    deleteGroup(groupId) {
        if (!this.currentDb) throw new Error('Nenhum banco aberto.');

        const group = this.currentDb.getGroup(groupId);
        if (!group) throw new Error('Grupo não encontrado.');

        if (group === this.currentDb.getDefaultGroup()) {
            throw new Error('Não é possível excluir o grupo raiz.');
        }

        this.currentDb.remove(group);
        this.hasUnsavedChanges = true;
        return this.getDatabaseData();
    }

    /**
     * Close the database and reset state
     */
    closeDatabase() {
        this.currentDb = null;
        this.currentFilePath = null;
        this.hasUnsavedChanges = false;
    }
}

module.exports = new KdbxService();
