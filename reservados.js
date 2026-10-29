/* ============================================================
   NÚMEROS JÁ VENDIDOS — você controla a rifa editando só esta linha
   ------------------------------------------------------------
   Este arquivo precisa ficar na MESMA PASTA do index.html.

   Fluxo:
   1. O comprador escolhe os números no site e manda no Direct
      (ou WhatsApp) algo como: "Escolhi os números 003 e 017.
      Ficou R$ 10,00." + o comprovante do Pix.
   2. Você confere o Pix.
   3. Aqui no VS Code, coloque os números na lista abaixo e salve.
      Ex.: vendeu 3, 17 e 42 →  window.RIFA_RESERVADOS = [3, 17, 42];
   4. Suba o arquivo para a hospedagem. Recarregue o site com
      Ctrl+F5 (o cache pode demorar alguns minutos).

   Números vão de 1 a 250 (veja totalNumeros no index.html).

   Como conferir:
   - Abra o site com ?debug no final do endereço, aperte F12 e
     veja a aba Console: ela lista os números lidos deste arquivo.
     Se o arquivo não for encontrado, aparece um erro em vermelho.
   - Testando no seu computador? Use a extensão "Live Server" do VS Code.
   - O site NÃO bloqueia nada sozinho: reservar pelo site não tira o
     número da grade. Só os números escritos na lista abaixo ficam
     bloqueados, e só quando você colocar.
   ============================================================ */
window.RIFA_RESERVADOS = [];
