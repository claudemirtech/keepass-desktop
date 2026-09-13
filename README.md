# Gerenciador de Senhas KeePass (Electron)

Aplicativo desktop construído com **Electron** e **kdbxweb** para gerenciar bases de senhas KeePass (`.kdbx`).

## 🚀 Funcionalidades

- **Abertura e Desbloqueio Seguro**:
  - Suporte a senha mestra e arquivo chave opcional (*key file*).
  - Compatível com bases **KDBX v3.x** (AES-KDF) e **KDBX v4.x** (Argon2d / Argon2id via WebAssembly).
- **Gerenciamento de Entradas (Senhas)**:
  - Adicionar, editar, visualizar e excluir senhas.
  - Campos: Título, Grupo, Nome de Usuário, Senha, URL e Observações / Notas.
  - Ocultação/Exibição de senha por padrão (`••••••••`).
  - Cópia com um clique do nome de usuário e senha para a área de transferência.
  - Limpeza automática da área de transferência após 30 segundos (medida de segurança).
- **Gerenciamento de Grupos**:
  - Organização hierárquica por pastas/grupos.
  - Criação e exclusão de grupos.
- **Busca Rápida**:
  - Filtro em tempo real por título, usuário, url ou anotações.
- **Gerador de Senhas Fortes Integrado**:
  - Geração personalizável (tamanho, letras maiúsculas, minúsculas, números e símbolos especiais).
  - Medidor dinâmico de força da senha (Fraca, Média, Forte, Excelente).
- **Criação e Salvamento**:
  - Opção para criar um novo arquivo `.kdbx` com senha personalizada.
  - Salvamento seguro das alterações com cópia de segurança (*backup*) automática `.bak`.

---

---

## 💻 Como Executar em Modo de Desenvolvimento

```bash
npm start
```

---

## 📦 Gerar e Instalar o Pacote (.deb)

Para empacotar e instalar o aplicativo nativamente no Ubuntu:

### 1. Gerar o pacote `.deb`:
```bash
npm run dist
```
O arquivo instalador será criado na pasta `dist/keepass-desktop_1.0.0_amd64.deb`.

### 2. Instalar no sistema operacional:
```bash
sudo dpkg -i dist/keepass-desktop_1.0.0_amd64.deb
```
*(Se o sistema acusar alguma dependência faltando, rode `sudo apt-get install -f`).*

Após a instalação, o aplicativo estará disponível no menu de aplicativos do Ubuntu (buscando por **"KeePass Manager"**) e pode ser fixado na barra de favoritos (Dock).

### 3. Para desinstalar (caso necessário):
```bash
sudo apt remove keepass-desktop
```

---

## 🛠️ Teste via Terminal (CLI)

Caso queira testar a leitura da base diretamente pelo terminal:

```bash
node database.js "SUA_SENHA_MESTRA"
```
