/**
 * Script utilitário / CLI para testar leitura do Database.kdbx via terminal
 * Uso: node database.js [sua_senha_aqui]
 */
const kdbxService = require('./kdbx-service');
const path = require('path');

const password = process.argv[2] || 'password';
const dbPath = path.resolve(__dirname, 'Database.kdbx');

(async () => {
    console.log(`Tentando abrir "${dbPath}" com a senha informada...`);
    try {
        const data = await kdbxService.openDatabase(dbPath, password);
        console.log(`\nBase desbloqueada com sucesso!`);
        console.log(`Total de entradas: ${data.entries.length}`);
        console.log(`Grupos: ${data.flatGroups.map(g => g.name).join(', ')}\n`);

        console.log('--- ENTRADAS ENCONTRADAS ---');
        data.entries.forEach((entry, idx) => {
            console.log(`\n[${idx + 1}] ${entry.title}`);
            console.log(`    Grupo:   ${entry.groupName}`);
            console.log(`    Usuário: ${entry.username || '(vazio)'}`);
            console.log(`    Senha:   ${entry.password ? '****** (oculta)' : '(vazia)'}`);
            console.log(`    URL:     ${entry.url || '(nenhuma)'}`);
            if (entry.notes) console.log(`    Notas:   ${entry.notes}`);
        });
    } catch (err) {
        console.error('\nErro ao abrir o banco:');
        console.error(err.message);
        console.log('\nDica: passe a senha mestra correta como argumento:');
        console.log('  node database.js "SUA_SENHA_MESTRA"');
    }
})();
