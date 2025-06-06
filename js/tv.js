const socket = io();  // Conecta ao servidor

socket.on('nova-chamada', (data) => {
  const texto = `${data.nome} - ${data.consultorio} - Profissional: ${data.medico}`;
  
  const div = document.createElement('div');
  div.textContent = texto;
  document.getElementById('chamadas').prepend(div);

  // === Lógica para preposição (ao / à) ===
  let preposicao = 'ao';
  const consultorio = data.consultorio.toLowerCase();
  if (consultorio.includes('sala de')) {
    preposicao = 'à'; // sala de enfermagem, sala de odontologia
  }

  // === Lógica para gênero do profissional (o / a) ===
  let pronomeProfissional = 'o profissional';
  const medico = data.medico.toLowerCase();
  if (medico.includes('doutora') || medico.includes('dra') || medico.endsWith('a')) {
    pronomeProfissional = 'a profissional';
  }

  // === Mensagem falada ===
  const mensagem = `Paciente ${data.nome}, dirigir-se ${preposicao} ${data.consultorio}, com ${pronomeProfissional} ${data.medico}.`;
  const utterance = new SpeechSynthesisUtterance(mensagem);
  utterance.lang = 'pt-BR'; // Português do Brasil
  speechSynthesis.speak(utterance);
});
