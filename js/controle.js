const socket = io();
const chamadasRecentes = [];
let pacienteSelecionado = null;

// ====================== DADOS DO USUÁRIO ======================
const usuarioLogado = document.body.dataset.usuario;
const tipoLogado = document.body.dataset.tipo;

// ====================== EVENTO DE CHAMADA ======================
document.getElementById('form-chamada').addEventListener('submit', (e) => {
  e.preventDefault();

  const nome = document.getElementById('nome').value;
  const setor = document.getElementById('setor').value;
  const consultorio = document.getElementById('consultorio').value;
  const medico = document.getElementById('medico').value;

  const chamada = { nome, setor, consultorio, medico };
  socket.emit('nova-chamada', chamada);

  chamadasRecentes.unshift(chamada);
  if (chamadasRecentes.length > 5) chamadasRecentes.pop();

  renderizarChamadasRecentes();
  e.target.reset();
});

function renderizarChamadasRecentes() {
  const container = document.getElementById('historico');
  container.innerHTML = '';

  chamadasRecentes.forEach((c) => {
    const item = document.createElement('div');
    item.textContent = `${c.nome} - ${c.setor} - ${c.consultorio} - ${c.medico}`;
    container.appendChild(item);
  });
}

// ================== INICIALIZAÇÃO E EVENTOS ====================
document.addEventListener('DOMContentLoaded', () => {
  carregarTriagem();

  document.getElementById('tipo-profissional').addEventListener('change', buscarProfissionais);

  document.getElementById('confirmar-encaminhamento').addEventListener('click', () => {
    const destino = document.getElementById('tipo-profissional').value;
    const responsavel = document.getElementById('profissional-destino').value;

    if (!pacienteSelecionado) {
      return alert("Nenhum paciente selecionado.");
    }

    fetch('/api/encaminhamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: pacienteSelecionado.nome,
        destino,
        responsavel
      })
    }).then(res => {
      if (res.ok) {
        fecharModal();
        carregarTriagem();
      } else {
        alert("Erro ao encaminhar paciente.");
      }
    });
  });

  document.getElementById('cancelar-encaminhamento').addEventListener('click', (e) => {
    e.preventDefault();
    fecharModal();
  });

  document.getElementById('fechar-modal').addEventListener('click', fecharModal);

  // Pré-preenche o campo médico se for da área correspondente
  if (['medico', 'dentista', 'nutricao'].includes(tipoLogado)) {
    const inputMedico = document.getElementById('medico');
    inputMedico.value = usuarioLogado;
    inputMedico.readOnly = true;
  }

  // Oculta o campo consultório se for nutricionista
  if (tipoLogado === 'nutricao') {
    const inputConsultorio = document.getElementById('consultorio');
    inputConsultorio.required = false;
    inputConsultorio.style.display = 'none';
  }

  // Sidebar toggle
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('aberta');
    });
  }

  // Delegação de evento para botões de encaminhamento
  const listaTriagem = document.getElementById('lista-triagem');
  listaTriagem.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-encaminhar')) {
      const nome = e.target.dataset.nome;
      pacienteSelecionado = { nome };
      document.getElementById('nomePaciente').value = nome;
      abrirModal(pacienteSelecionado);
    }
  });
});

// ================== TRIAGEM ====================
function carregarTriagem() {
  fetch('/api/triagem')
    .then(res => res.json())
    .then(data => {
      const lista = document.getElementById('lista-triagem');
      lista.innerHTML = '';

      data.forEach(paciente => {
        const item = document.createElement('li');
        item.textContent = paciente.nome;

        const btn = document.createElement('button');
        btn.textContent = 'Encaminhar';
        btn.classList.add('btn-encaminhar');
        btn.setAttribute('data-nome', paciente.nome);

        item.appendChild(btn);
        lista.appendChild(item);
      });
    });
}

// ================== MODAL DE ENCAMINHAMENTO ====================
function abrirModal(paciente) {
  pacienteSelecionado = paciente;
  document.getElementById('nomePaciente').value = paciente.nome;
  document.getElementById('modal-encaminhamento').style.display = 'block';
  buscarProfissionais();
}

function fecharModal() {
  document.getElementById('modal-encaminhamento').style.display = 'none';
  pacienteSelecionado = null;
}

function buscarProfissionais() {
  const tipo = document.getElementById('tipo-profissional').value;
  const select = document.getElementById('profissional-destino');

  fetch(`/api/profissionais?tipo=${tipo}`)
    .then(res => res.json())
    .then(data => {
      select.innerHTML = '';

      data.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.username;
        opt.textContent = p.username;
        select.appendChild(opt);
      });

      // Se o tipo do profissional selecionado for o mesmo do usuário logado, pré-seleciona
      if (tipo === tipoLogado) {
        const option = [...select.options].find(opt => opt.value === usuarioLogado);
        if (option) select.value = usuarioLogado;
      }
    });
}

document.addEventListener('DOMContentLoaded', () => {
  const btnMeusPacientes = document.getElementById('btn-meus-pacientes');
  const divMeusPacientes = document.getElementById('meus-pacientes');

  if (btnMeusPacientes && divMeusPacientes) {
    btnMeusPacientes.addEventListener('click', () => {
      // Alterna entre mostrar e esconder a div
      if (divMeusPacientes.style.display === 'none') {
        divMeusPacientes.style.display = 'block';
      } else {
        divMeusPacientes.style.display = 'none';
      }
    });
  }
});

function abrirMeusPacientes() {
    window.open("meus_pacientes.html", "_blank");
}
