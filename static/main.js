$(function(){
    // Busca dinâmica
    $('#busca').on('input', function(){
        buscarRenderizar();
    });

    // Filtro por cidade
    $('#cidadeFiltro').on('change', function(){
        buscarRenderizar();
    });

    // Filtro/sort por data de entrega
    $('#dataEntregaFiltro').on('change', function(){
        buscarRenderizar();
    });

    // Selecionar/desselecionar todos
    $(document).on('change', '#checkAll', function(){
        $('.cliente-check').prop('checked', this.checked);
    });

    // Quando uma checkbox for alterada, se todas estiverem marcadas, marca o checkAll, senão desmarca
    $(document).on('change', '.cliente-check', function(){
        $('#checkAll').prop('checked', $('.cliente-check:checked').length === $('.cliente-check').length);
    });

    // Exportar para Excel
    $('#exportExcel').on('click', function(){
        let selectedIds = $('.cliente-check:checked').map(function(){ return $(this).val(); }).get();
        let cidade = $('#cidadeFiltro').val();
        // Se algum cliente estiver selecionado, ignora filtro de cidade
        $.ajax({
            url: '/export_excel',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ids: selectedIds, cidade: selectedIds.length === 0 ? cidade : ""}),
            xhrFields: { responseType: 'blob' },
            success: function(blob){
                let link = document.createElement('a');
                link.href = window.URL.createObjectURL(blob);
                link.download = 'clientes_oxy.xlsx';
                link.click();
            }
        });
    });

    // Busca e renderização dinâmica (inclui filtros e checkboxes)
    function buscarRenderizar() {
        let q = $('#busca').val();
        let cidadeFiltro = $('#cidadeFiltro').val();
        $.get('/search', {q: q}, function(resultados){
            if (cidadeFiltro) {
                resultados = resultados.filter(function(c){
                    return c.cidade === cidadeFiltro;
                });
            }

            // Ordenação por data de entrega
            let ordenacao = $('#dataEntregaFiltro').val() || "prox";
            if (ordenacao !== "nenhum") {
                resultados.sort(function(a, b) {
                    // Trata datas vazias: datas vazias vão pro fim
                    if (!a.data_entrega && !b.data_entrega) return 0;
                    if (!a.data_entrega) return 1;
                    if (!b.data_entrega) return -1;
                    let dataA = new Date(a.data_entrega);
                    let dataB = new Date(b.data_entrega);
                    if (ordenacao === "prox") {
                        return dataA - dataB; // Mais próximo primeiro
                    } else {
                        return dataB - dataA; // Mais distante primeiro
                    }
                });
            }

            let tbody = '';
            resultados.forEach(function(c){
                // STATUS E PRIORIDADE
                let statusClass = 'status-' + (c.status || '').replace(' ', '').replace('O', 'o');
                let prioridadeClass = c.prioridade !== 'Normal' ? 'prioridade-' + c.prioridade : '';

                // ALERTA ÚLTIMA CONVERSA
                let ultimaClasse = '';
                if (c.ultima_conversa) {
                    let hoje = new Date();
                    let ultima = new Date(c.ultima_conversa);
                    let diffDias = Math.floor((hoje - ultima) / (1000 * 60 * 60 * 24));
                    if (diffDias >= 14) {
                        ultimaClasse = 'ultima-2semanas';
                    } else if (diffDias > 7) {
                        ultimaClasse = 'ultima-1semana';
                    }
                }

                tbody += `<tr>
                    <td><input type="checkbox" class="cliente-check" value="${c.id}"></td>
                    <td>${c.data_entrega || ''}</td>
                    <td>${c.nome}</td>
                    <td>${c.cnpj || ''}</td>
                    <td>${c.cidade || ''}</td>
                    <td>${c.matricula || ''}</td>
                    <td class="${statusClass}">${c.status}</td>
                    <td class="${ultimaClasse}">${c.ultima_conversa || ''}</td>
                    <td>${c.observacoes || ''}</td>
                    <td class="${prioridadeClass}">${c.prioridade}</td>
                    <td>
                        <form method="POST" action="/delete/${c.id}" style="display:inline">
                            <button class="btn btn-sm btn-danger" onclick="return confirm('Confirmar exclusão?')">Excluir</button>
                        </form>
                    </td>
                </tr>`;
            });
            $('#clientes-tbody').html(tbody);
            $('#checkAll').prop('checked', false); // desmarcar master checkbox
        });
    }

    // Inicializa renderização na primeira carga
    buscarRenderizar();
});
