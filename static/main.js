$(function(){
    $('#busca').on('input', function(){ buscarRenderizar(); });
    $('#cidadeFiltro').on('change', function(){ buscarRenderizar(); });
    $('#dataEntregaFiltro').on('change', function(){ buscarRenderizar(); });
    $(document).on('change', '#checkAll', function(){ $('.cliente-check').prop('checked', this.checked); });
    $(document).on('change', '.cliente-check', function(){ $('#checkAll').prop('checked', $('.cliente-check:checked').length === $('.cliente-check').length); });
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

    function buscarRenderizar() {
        let q = $('#busca').val();
        let cidadeFiltro = $('#cidadeFiltro').val();
        $.get('/search', {q: q}, function(resultados){
            if (cidadeFiltro) {
                resultados = resultados.filter(function(c){ return c.cidade === cidadeFiltro; });
            }
            let ordenacao = $('#dataEntregaFiltro').val() || "prox";
            if (ordenacao !== "nenhum") {
                resultados.sort(function(a, b) {
                    if (!a.data_entrega && !b.data_entrega) return 0;
                    if (!a.data_entrega) return 1;
                    if (!b.data_entrega) return -1;
                    let dataA = new Date(a.data_entrega);
                    let dataB = new Date(b.data_entrega);
                    if (ordenacao === "prox") { return dataA - dataB; }
                    else { return dataB - dataA; }
                });
            }

            let tbody = '';
            resultados.forEach(function(c){
                let statusClass = 'status-' + (c.status || '').replace(' ', '');
                let entregaClass = 'entrega-' + (c.entrega || '').replace(' ', '');
                let nomeStyle = (String(c.prioridade || '').trim().toLowerCase() === 'alta') ? 'style="color:#d60000;font-weight:bold;"' : '';
                let ultimaClasse = '';
                if (c.ultima_conversa) {
                    let hoje = new Date();
                    let ultima = new Date(c.ultima_conversa);
                    let diffDias = Math.floor((hoje - ultima) / (1000 * 60 * 60 * 24));
                    if (diffDias >= 14) { ultimaClasse = 'ultima-2semanas'; }
                    else if (diffDias > 7) { ultimaClasse = 'ultima-1semana'; }
                }

                tbody += `<tr>
                    <td><input type="checkbox" class="cliente-check" value="${c.id}"></td>
                    <td>${c.data_entrega || ''}</td>
                    <td ${nomeStyle}>${c.nome}</td>
                    <td>${c.cnpj || ''}</td>
                    <td>${c.cidade || ''}</td>
                    <td>${c.matricula || ''}</td>
                    <td class="${statusClass}">${c.status}</td>
                    <td class="${entregaClass}">${c.entrega}</td>
                    <td>${c.quantidade || ''}</td>
                    <td class="${ultimaClasse}">${c.ultima_conversa || ''}</td>
                    <td>${c.observacoes || ''}</td>
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
    buscarRenderizar();

    // Modal de edição: preencher dados corretamente (inclusive prioridade)
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
            $('#edit-entrega').val(c.entrega || 'A receber');
            $('#edit-quantidade').val(c.quantidade || '');
            $('#edit-ultima_conversa').val(c.ultima_conversa || '');
            $('#edit-observacoes').val(c.observacoes || '');
            // CORREÇÃO: força sempre Normal/Alta corretamente
            let prioridade = (c.prioridade || 'Normal').trim().toLowerCase() === 'alta' ? 'Alta' : 'Normal';
            $('#edit-prioridade').val(prioridade);
            var modal = new bootstrap.Modal(document.getElementById('editClienteModal'));
            modal.show();
        });
    });

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
            entrega: $('#edit-entrega').val(),
            quantidade: $('#edit-quantidade').val(),
            prioridade: $('#edit-prioridade').val(),
            ultima_conversa: $('#edit-ultima_conversa').val(),
            observacoes: $('#edit-observacoes').val()
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

    $('#add-cliente-form').on('submit', function(){
        $('#add-feedback').css('color', '#2977f6').text('Adicionando...');
    });
});
