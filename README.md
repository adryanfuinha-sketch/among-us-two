# Among Us Two — redesign romântico

Esta versão mantém Firebase Authentication e Cloud Firestore, com uma interface vintage romântica, páginas Início / Cartas / História / Nosso espaço, abertura de cartas e aviso animado quando chega uma nova carta de outra pessoa.

## Como atualizar o GitHub
Substitua no repositório os arquivos `index.html`, `style.css` e `app.js` pelos arquivos desta pasta. Não é necessário alterar as regras do Firestore se as regras que já foram publicadas forem as mesmas que permitem ler/criar cartas e entrar em um espaço com até duas pessoas.

Depois do commit, espere o GitHub Pages publicar e atualize o site limpando o cache ou abrindo uma guia anônima.

## Firebase
A configuração Web existente foi mantida no `app.js`. Firebase Web config é usada no navegador; não coloque chaves privadas ou credenciais de serviço no site.

## Observação
O aviso de nova carta aparece enquanto o site está aberto e conectado. Notificações push com o site fechado exigiriam configuração adicional (Firebase Cloud Messaging e service worker).
