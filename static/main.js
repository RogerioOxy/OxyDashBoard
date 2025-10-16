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

    $(document).on('change', '.cliente-check', function(){
        $('#checkAll').prop('checked', $('.cliente-check:checked').length === $('.cliente-check').length);
    });

    // Exportar para Excel
    $('#exportExcel').on('click', function(){
        let selectedIds = $('.cliente-check:checked').map(function(){ return $(this).val(); }).get();
        let cidade = $('#cidadeFiltro').val();
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

    // Render tabela dinâmica (com botão editar)
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
                    if (!a.data_entrega && !b.data_entrega) return 0;
                    if (!a.data_entrega) return 1;
                    if (!b.data_entrega) return -1;
                    let dataA = new Date(a.data_entrega);
                    let dataB = new Date(b.data_entrega);
                    if (ordenacao === "prox") {
                        return dataA - dataB;
                    } else {
                        return dataB - dataA;
                    }
                });
            }

            let tbody = '';
            resultados.forEach(function(c){
                let statusClass = 'status-' + (c.status || '').replace(' ', '').replace('O', 'o');
                let prioridadeClass = c.prioridade !== 'Normal' ? 'prioridade-' + c.prioridade : '';
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
                        <button class="btn btn-sm btn-warning btn-edit" data-id="${c.id}">Editar</button>
                        <form method="POST" action="/delete/${c.id}" style="display:inline">
                            <button class="btn btn-sm btn-danger" onclick="return confirm('Confirmar exclusão?')">Excluir</button>
                        </form>
                    </td>
                </tr>`;
            });
            $('#clientes-tbody').html(tbody);
            $('#checkAll').prop('checked', false);
        });
    }

    // Render na primeira carga
    buscarRenderizar();

    // --- Edição de Cliente ---

    // Abrir modal e preencher
    $(document).on('click', '.btn-edit', function(){
        let id = $(this).data('id');
        $('#edit-feedback').text('');
        $.get('/get_cliente/' + id, function(c){
            $('#edit-id').val(c.id);
            $('#edit-data_entrega').val(c.data_entrega || '');
            $('#edit-nome').val(c.nome || '');
            $('#edit-cnpj').val(c.cnpj || '');
            $('#edit-cidade').val(c.cidade || '');
            $('#edit-matricula').val(c.matricula || '');
            $('#edit-status').val(c.status || 'Em obra');
            $('#edit-ultima_conversa').val(c.ultima_conversa || '');
            $('#edit-observacoes').val(c.observacoes || '');
            $('#edit-prioridade').val(c.prioridade || 'Normal');
            var modal = new bootstrap.Modal(document.getElementById('editClienteModal'));
            modal.show();
        });
    });

    // Submeter edição via AJAX
    $('#edit-cliente-form').on('submit', function(e){
        e.preventDefault();
        $('#edit-feedback').css('color', '#e34c49').text('Salvando...');
        let id = $('#edit-id').val();
        let formData = {
            data_entrega: $('#edit-data_entrega').val(),
            nome: $('#edit-nome').val(),
            cnpj: $('#edit-cnpj').val(),
            cidade: $('#edit-cidade').val(),
            matricula: $('#edit-matricula').val(),
            status: $('#edit-status').val(),
            ultima_conversa: $('#edit-ultima_conversa').val(),
            observacoes: $('#edit-observacoes').val(),
            prioridade: $('#edit-prioridade').val()
        };
        $.ajax({
            url: '/edit/' + id,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function(resp){
                if (resp.success) {
                    $('#edit-feedback').css('color', 'green').text('Alterações salvas!');
                    setTimeout(function(){
                        var modalEl = document.getElementById('editClienteModal');
                        var modal = bootstrap.Modal.getInstance(modalEl);
                        modal.hide();
                        buscarRenderizar();
                    }, 700);
                } else {
                    $('#edit-feedback').css('color', '#e34c49').text(resp.error || 'Erro ao salvar!');
                }
            },
            error: function(){
                $('#edit-feedback').css('color', '#e34c49').text('Erro ao salvar!');
            }
        });
    });

    // Feedback para formulário de adição
    $('#add-cliente-form').on('submit', function(){
        $('#add-feedback').css('color', '#2977f6').text('Adicionando...');
    });
});
