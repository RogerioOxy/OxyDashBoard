# Ativa a venv e inicia o app
if (!(Test-Path .\venv)) {
    Write-Host "Criando ambiente virtual e instalando dependências..."
    python -m venv venv
    .\venv\Scripts\Activate
    pip install -r requirements.txt
} else {
    .\venv\Scripts\Activate
    pip install -r requirements.txt
}
py app.py
