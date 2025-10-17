from flask import Flask, render_template, request, redirect, url_for, jsonify, send_file
from models import db, Cliente
from datetime import datetime
import pandas as pd
import io

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

with app.app_context():
    db.create_all()

@app.route('/')
def index():
    clientes = Cliente.query.all()
    cidades = sorted(list({c.cidade for c in clientes if c.cidade}))
    agora = datetime.now()
    return render_template('index.html', clientes=clientes, cidades=cidades, current_time=agora)

@app.route('/add', methods=['POST'])
def add_cliente():
    data = request.form
    novo = Cliente(
        data_entrega=datetime.strptime(data['data_entrega'], '%Y-%m-%d') if data.get('data_entrega') else None,
        nome=data['nome'],
        cnpj=data.get('cnpj'),
        cidade=data.get('cidade'),
        matricula=data.get('matricula'),
        status=data.get('status', 'Em obra'),
        entrega=data.get('entrega', 'A receber'),
        quantidade=int(data.get('quantidade')) if data.get('quantidade') else None,
        prioridade=data.get('prioridade', 'Normal'),
        ultima_conversa=datetime.strptime(data['ultima_conversa'], '%Y-%m-%d') if data.get('ultima_conversa') else None,
        observacoes=data.get('observacoes')
    )
    db.session.add(novo)
    db.session.commit()
    return redirect(url_for('index'))

@app.route('/delete/<int:id>', methods=['POST'])
def delete_cliente(id):
    cliente = Cliente.query.get(id)
    db.session.delete(cliente)
    db.session.commit()
    return redirect(url_for('index'))

@app.route('/search')
def search():
    q = request.args.get('q', '').lower()
    resultados = []
    for c in Cliente.query.all():
        if (q in (c.nome or '').lower() or
            q in (c.cnpj or '').lower() or
            q in (c.cidade or '').lower() or
            q in (c.matricula or '').lower() or
            q in (c.status or '').lower() or
            q in (c.entrega or '').lower() or
            q in (str(c.quantidade) if c.quantidade else '') or
            q in (c.observacoes or '').lower() or
            (c.data_entrega and q in c.data_entrega.strftime('%Y-%m-%d')) or
            (c.ultima_conversa and q in c.ultima_conversa.strftime('%Y-%m-%d'))):
            resultados.append({
                'id': c.id,
                'data_entrega': c.data_entrega.strftime('%Y-%m-%d') if c.data_entrega else '',
                'nome': c.nome,
                'cnpj': c.cnpj,
                'cidade': c.cidade,
                'matricula': c.matricula,
                'status': c.status,
                'entrega': c.entrega,
                'quantidade': c.quantidade,
                'ultima_conversa': c.ultima_conversa.strftime('%Y-%m-%d') if c.ultima_conversa else '',
                'observacoes': c.observacoes,
                'prioridade': c.prioridade,
            })
    return jsonify(resultados)

@app.route('/export_excel', methods=['POST'])
def export_excel():
    ids = request.json.get('ids', [])
    cidade = request.json.get('cidade', '')

    query = Cliente.query
    if ids:
        query = query.filter(Cliente.id.in_(ids))
    elif cidade:
        query = query.filter_by(cidade=cidade)
    clientes = query.all()

    data = []
    for c in clientes:
        data.append({
            'Data de Entrega': c.data_entrega.strftime('%Y-%m-%d') if c.data_entrega else '',
            'Nome': c.nome,
            'CNPJ': c.cnpj,
            'Cidade': c.cidade,
            'Matrícula': c.matricula,
            'Status': c.status,
            'Entrega': c.entrega,
            'Quantidade': c.quantidade,
            'Último Contato': c.ultima_conversa.strftime('%Y-%m-%d') if c.ultima_conversa else '',
            'Observações': c.observacoes,
        })

    df = pd.DataFrame(data)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name="Clientes")
    output.seek(0)

    return send_file(
        output,
        as_attachment=True,
        download_name="clientes_oxy.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

@app.route('/get_cliente/<int:id>')
def get_cliente(id):
    c = Cliente.query.get(id)
    if not c:
        return jsonify({'error': 'Cliente não encontrado!'}), 404
    return jsonify({
        'id': c.id,
        'data_entrega': c.data_entrega.strftime('%Y-%m-%d') if c.data_entrega else '',
        'nome': c.nome,
        'cnpj': c.cnpj,
        'cidade': c.cidade,
        'matricula': c.matricula,
        'status': c.status,
        'entrega': c.entrega,
        'quantidade': c.quantidade,
        'ultima_conversa': c.ultima_conversa.strftime('%Y-%m-%d') if c.ultima_conversa else '',
        'observacoes': c.observacoes,
        'prioridade': c.prioridade,
    })

@app.route('/edit/<int:id>', methods=['POST'])
def edit_cliente(id):
    c = Cliente.query.get(id)
    if not c:
        return jsonify({'success': False, 'error': 'Cliente não encontrado!'}), 404
    data = request.get_json()
    try:
        c.data_entrega = datetime.strptime(data.get('data_entrega',''), '%Y-%m-%d') if data.get('data_entrega') else None
        c.nome = data.get('nome')
        c.cnpj = data.get('cnpj')
        c.cidade = data.get('cidade')
        c.matricula = data.get('matricula')
        c.status = data.get('status')
        c.entrega = data.get('entrega')
        c.quantidade = int(data.get('quantidade')) if data.get('quantidade') else None
        c.prioridade = data.get('prioridade', 'Normal')
        c.ultima_conversa = datetime.strptime(data.get('ultima_conversa',''), '%Y-%m-%d') if data.get('ultima_conversa') else None
        c.observacoes = data.get('observacoes')
        if not c.nome:
            return jsonify({'success': False, 'error': 'O campo Nome é obrigatório!'})
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True)
