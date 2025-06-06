from flask import Flask, request, session, redirect, url_for, render_template, send_from_directory, jsonify
from flask_socketio import SocketIO
from dotenv import load_dotenv
import os
import json

load_dotenv()

app = Flask(__name__, template_folder='html')
app.secret_key = os.getenv('SECRET_KEY')
socketio = SocketIO(app, cors_allowed_origins="*")

# --------- 📁 Arquivos e Constantes ---------
USERS_FILE = 'users.json'
ENCAMINHAMENTOS_FILE = 'encaminhamentos.json'
TRIAGEM_FILE = 'triagem.json'

# --------- 🧩 Funções Utilitárias ---------
def carregar_usuarios():
    if not os.path.exists(USERS_FILE):
        return []
    with open(USERS_FILE, 'r') as f:
        return json.load(f)

def salvar_usuarios(usuarios):
    with open(USERS_FILE, 'w') as f:
        json.dump(usuarios, f, indent=2)

def carregar_triagem():
    if not os.path.exists(TRIAGEM_FILE):
        return []
    with open(TRIAGEM_FILE, 'r') as f:
        return json.load(f)

def salvar_triagem(lista):
    with open(TRIAGEM_FILE, 'w') as f:
        json.dump(lista, f, indent=2)

def carregar_encaminhamentos():
    if not os.path.exists(ENCAMINHAMENTOS_FILE):
        return []
    with open(ENCAMINHAMENTOS_FILE, 'r') as f:
        return json.load(f)

def salvar_encaminhamentos(lista):
    with open(ENCAMINHAMENTOS_FILE, 'w') as f:
        json.dump(lista, f, indent=2)

def usuario_logado():
    return 'usuario' in session

def tipo_usuario():
    return session.get('tipo', None)

def admin_required(f):
    def wrapper(*args, **kwargs):
        if not usuario_logado() or tipo_usuario() != 'admin':
            return jsonify({'erro': 'Acesso negado'}), 403
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

# --------- 🌐 Arquivos Estáticos ---------
@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory('css', filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory('js', filename)

@app.route('/<path:filename>')
def serve_html(filename):
    return send_from_directory('html', filename)

@app.route('/')
def index():
    return redirect(url_for('controle'))

# --------- 🔐 Login ---------
@app.route('/login', methods=['GET', 'POST'])
def login():
    erro = None
    if request.method == 'POST':
        usuarios = carregar_usuarios()
        username = request.form['username']
        password = request.form['password']

        for usuario in usuarios:
            if usuario['username'] == username and usuario['password'] == password:
                session['usuario'] = username
                session['tipo'] = usuario['role']
                return redirect(url_for('controle'))

        erro = 'Usuário ou senha incorretos.'

    return render_template('login.html', erro=erro)

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# --------- 📋 Controle ---------
@app.route('/controle')
def controle():
    if not usuario_logado():
        return redirect(url_for('login'))

    return render_template('controle.html',
                           usuario=session['usuario'],
                           tipo=session['tipo'])

@app.route('/usuarios')
def usuarios():
    if not usuario_logado() or tipo_usuario() != 'admin':
        return "Acesso não autorizado", 403
    return render_template('usuarios.html')

@app.route('/api/profissionais')
def get_profissionais():
    tipo = request.args.get('tipo')
    usuarios = carregar_usuarios()
    profissionais = [u for u in usuarios if u.get('role') == tipo]
    return jsonify(profissionais)

# --------- 📺 TV ---------
@app.route('/tv')
def tv():
    return render_template('tv.html')

# --------- 🔊 WebSocket ---------
@socketio.on('nova-chamada')
def handle_nova_chamada(data):
    socketio.emit('nova-chamada', data)

    if data.get('setor') == 'triagem':
        triagem = carregar_triagem()
        triagem.append({
            "nome": data.get('nome'),
            "setor": data.get('setor')
        })
        salvar_triagem(triagem)

# --------- 📦 Triagem ---------
@app.route('/api/triagem', methods=['GET'])
def listar_triagem():
    if not usuario_logado():
        return jsonify({'erro': 'Login necessário'}), 401
    return jsonify(carregar_triagem())

# --------- 🚚 Encaminhamentos ---------
@app.route('/api/encaminhamentos', methods=['POST'])
def novo_encaminhamento():
    if not usuario_logado():
        return jsonify({'erro': 'Login necessário'}), 401

    dados = request.get_json()
    nome = dados.get('nome')
    destino = dados.get('destino')
    responsavel = dados.get('responsavel')

    if not nome or not destino or not responsavel:
        return jsonify({'erro': 'Dados incompletos'}), 400

    triagem = carregar_triagem()
    triagem = [p for p in triagem if p['nome'] != nome]
    salvar_triagem(triagem)

    encaminhamentos = carregar_encaminhamentos()
    encaminhamentos.append({
        "nome": nome,
        "encaminhado_por": session['usuario'],
        "destino": destino,
        "responsavel": responsavel,
        "status": "aguardando"
    })

    salvar_encaminhamentos(encaminhamentos)
    return jsonify({'mensagem': 'Encaminhamento registrado com sucesso'}), 201

@app.route('/api/encaminhamentos', methods=['GET'])
def listar_encaminhamentos():
    if not usuario_logado():
        return jsonify({'erro': 'Login necessário'}), 401

    usuario = session['usuario']
    role = session['tipo']
    encaminhamentos = carregar_encaminhamentos()

    if role == 'admin' or role == 'enfermeira':
        return jsonify(encaminhamentos)

    filtrados = [e for e in encaminhamentos if e['responsavel'] == usuario and e['status'] == 'aguardando']
    return jsonify(filtrados)

@app.route('/api/encaminhamentos/concluir', methods=['POST'])
def concluir_encaminhamento():
    if not usuario_logado():
        return jsonify({'erro': 'Login necessário'}), 401

    dados = request.get_json()
    nome = dados.get('nome')
    if not nome:
        return jsonify({'erro': 'Nome do paciente não fornecido'}), 400

    encaminhamentos = carregar_encaminhamentos()
    for e in encaminhamentos:
        if e['nome'] == nome and e['responsavel'] == session['usuario']:
            e['status'] = 'chamado'

    salvar_encaminhamentos(encaminhamentos)
    return jsonify({'mensagem': 'Paciente chamado com sucesso'}), 200

@app.route('/meus_pacientes', methods=["GET"])
def meus_pacientes():
    if not usuario_logado():
        return jsonify({'erro': 'Login necessário'}), 401

    try:
        todos = carregar_encaminhamentos()
        usuario = session['usuario']
        filtrados = [p for p in todos if p['responsavel'] == usuario and p['status'] == 'aguardando']
        return jsonify(filtrados)
    except FileNotFoundError:
        return jsonify([])

# --------- 📞 Chamar Profissional ---------
@app.route('/api/chamar', methods=['POST'])
def chamar_profissional():
    if not usuario_logado():
        return jsonify({'erro': 'Login necessário'}), 401

    dados = request.get_json()
    nome = dados.get('nome')
    consultorio = dados.get('consultorio')
    setor = dados.get('setor', 'Consulta')
    profissional = session['usuario']

    socketio.emit('nova-chamada', {
        'nome': nome,
        'consultorio': consultorio,
        'setor': setor,
        'profissional': profissional
    })

    return jsonify({'status': 'ok'})

# --------- 👥 Usuários ---------
@app.route('/api/usuarios', methods=['GET'])
@admin_required
def listar_usuarios():
    usuarios = carregar_usuarios()
    return jsonify([
        {'username': u['username'], 'role': u['role']}
        for u in usuarios
    ])

@app.route('/api/usuarios', methods=['POST'])
@admin_required
def criar_usuario():
    dados = request.get_json(force=True)
    username = dados.get('username')
    password = dados.get('password')
    role = dados.get('role')

    if not username or not password or not role:
        return jsonify({'erro': 'Dados incompletos'}), 400

    usuarios = carregar_usuarios()
    if any(u['username'] == username for u in usuarios):
        return jsonify({'erro': 'Usuário já existe'}), 409

    usuarios.append({
        'username': username,
        'password': password,
        'role': role
    })
    salvar_usuarios(usuarios)

    return jsonify([
        {'username': u['username'], 'role': u['role']}
        for u in usuarios
    ]), 201

@app.route('/api/usuarios/<username>', methods=['DELETE'])
@admin_required
def deletar_usuario(username):
    usuarios = carregar_usuarios()
    novos = [u for u in usuarios if u['username'] != username]

    if len(novos) == len(usuarios):
        return jsonify({'erro': 'Usuário não encontrado'}), 404

    salvar_usuarios(novos)
    return jsonify({'mensagem': 'Usuário removido com sucesso'}), 200

# --------- 🚀 Inicialização ---------
if __name__ == '__main__':
    import eventlet
    import eventlet.wsgi
    socketio.run(app, host='0.0.0.0', port=10000)
