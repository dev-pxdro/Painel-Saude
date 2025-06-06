// Recupera o nome do profissional logado
const profissionalLogado = localStorage.getItem("nome_profissional");

if (!profissionalLogado) {
    alert("Profissional não identificado. Faça login novamente.");
    window.location.href = "/html/login.html"; 
}

// Função para carregar pacientes destinados ao profissional logado
async function carregarPacientes() {
    try {
        const resposta = await fetch("/meus_pacientes");
        const pacientes = await resposta.json();

        const tabela = document.getElementById("tabela-pacientes");
        tabela.innerHTML = "";

        const meusPacientes = pacientes.filter(p => p.responsavel === profissionalLogado);

        if (meusPacientes.length === 0) {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td colspan="5">Nenhum paciente encaminhado para você.</td>`;
            tabela.appendChild(tr);
        } else {
            meusPacientes.forEach(p => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${p.nome}</td>
                    <td>${p.destino || "N/A"}</td>
                    <td>${p.consultorio || "N/A"}</td>
                    <td>${p.encaminhado_por || "N/A"}</td>
                    <td><button onclick="chamarPaciente('${p.nome}')">Chamar</button></td>
                `;
                tabela.appendChild(tr);
            });
        }
    } catch (error) {
        console.error("Erro ao carregar pacientes:", error);
        alert("Erro ao carregar pacientes.");
    }
}

// Função para chamar paciente e concluir encaminhamento
async function chamarPaciente(nome) {
    const consultorio = prompt(`Digite o número da sala para chamar ${nome}:`);
    if (!consultorio) return;

    try {
        // Chamar o paciente
        const chamadaResponse = await fetch('/api/chamar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome,
                consultorio,
                setor: "Consulta"
            })
        });

        if (!chamadaResponse.ok) throw new Error("Erro ao chamar paciente.");

        // Marcar encaminhamento como concluído
        const concluirResponse = await fetch('/api/encaminhamentos/concluir', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome })
        });

        if (!concluirResponse.ok) throw new Error("Erro ao concluir encaminhamento.");

        alert(`Paciente ${nome} foi chamado com sucesso!`);
        carregarPacientes();
    } catch (error) {
        console.error("Erro ao chamar paciente:", error);
        alert("Falha ao chamar paciente.");
    }
}

carregarPacientes();
