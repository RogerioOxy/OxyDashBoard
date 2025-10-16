from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Cliente(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    data_entrega = db.Column(db.Date, nullable=True)
    nome = db.Column(db.String(120), nullable=False)
    cnpj = db.Column(db.String(18), nullable=True)
    cidade = db.Column(db.String(100), nullable=True)
    matricula = db.Column(db.String(50), nullable=True)
    status = db.Column(db.String(20), nullable=False, default="Em obra")  # "Em obra" ou "Entregue"
    prioridade = db.Column(db.String(10), nullable=False, default="Normal")  # "Normal" ou "Alta"
    ultima_conversa = db.Column(db.Date, nullable=True)
    observacoes = db.Column(db.Text, nullable=True)
