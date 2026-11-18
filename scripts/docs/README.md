# Geradores dos PDFs de documentação

Scripts Python (reportlab) que geram, a partir do estado atual do repositório:

- `gerar_manual.py` → `Manual_SisPTrab.pdf` (manual do usuário, usa as imagens em `Prints_SisPTrab/`)
- `gerar_doc_tecnica.py` → `Documentacao_Tecnica_SisPTrab.pdf` (documentação técnica)

## Uso

```bash
pip install -r scripts/docs/requirements.txt
python scripts/docs/gerar_manual.py
python scripts/docs/gerar_doc_tecnica.py
```

Os PDFs são escritos na raiz do repositório, sobrescrevendo os existentes. Atualize o
conteúdo (listas Python no topo de cada script) sempre que uma funcionalidade nova for
adicionada ao sistema.
