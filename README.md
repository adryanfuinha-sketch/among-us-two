# Among Us Two — V2 (base compartilhada)

Protótipo web responsivo com visual romântico vintage. Esta base usa Firebase Authentication e Cloud Firestore para contas individuais, um espaço compartilhado por duas pessoas e cartas sincronizadas.

## O que já está preparado
- Criar conta e entrar com e-mail e senha.
- Criar um espaço privado com código de convite.
- A segunda pessoa entra usando esse código.
- Cartas são salvas no Firestore e aparecem em tempo real para os dois.
- Regras iniciais do Firestore limitam o espaço a duas contas e impedem edição/exclusão de cartas pelo cliente.

## Antes de usar
Você precisa criar um projeto Firebase. Não envie sua senha nem credenciais privadas para ninguém.

1. Abra https://console.firebase.google.com/ e crie um projeto.
2. Adicione um aplicativo Web ao projeto e copie a configuração Firebase.
3. Em **Authentication → Sign-in method**, ative **Email/Password**.
4. Em **Firestore Database**, crie o banco de dados.
5. Abra `app.js` e substitua os valores de exemplo em `firebaseConfig` pelos valores do seu aplicativo Web.
6. Em **Firestore → Rules**, publique o conteúdo de `firestore.rules`.
7. Hospede os arquivos em um servidor HTTPS estático (por exemplo, Firebase Hosting). Para testar localmente, use um servidor local; abrir `index.html` diretamente como arquivo pode bloquear módulos JavaScript.

## Como vocês usam
1. Cada pessoa cria sua própria conta com seu próprio e-mail.
2. Uma pessoa entra e clica em **Criar nosso espaço**.
3. Compartilha o código exibido com a outra pessoa por um canal privado.
4. A outra pessoa cria sua conta, cola o código em **Entrar em um espaço** e pronto.
5. As cartas escritas na aba **Cartas** ficam visíveis para as duas contas.

## Importante
- O código do espaço é um convite secreto. Compartilhe apenas com a pessoa desejada.
- As regras impedem uma terceira conta de entrar quando o espaço já tem duas pessoas.
- Esta é uma primeira versão técnica. Antes de publicar amplamente, vale revisar as regras e adicionar recuperação de senha, verificação de e-mail, exclusão de conta/dados e testes de segurança.
- O projeto ainda não tem envio de notificações, anexos de fotos, cartas agendadas ou música integrada.
