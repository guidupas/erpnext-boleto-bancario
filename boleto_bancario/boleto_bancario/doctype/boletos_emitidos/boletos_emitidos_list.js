frappe.listview_settings['Boletos Emitidos'] = {
	colwidths: {"subject": 6},
	onload: function(listview) {
		listview.page.add_menu_item(__("Atualizar Todos os Boletos"), function() {
            //listview.call_for_selected_items(method, {"status": "Open"});
            var busca_situacao_boleto = ['Pendente', 'Não pago', 'Vencido'];
            frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: 'Boletos Emitidos',
                    fields: [
                        'name',
                        'codigo_cobranca',
                        'plataforma_emissora'
                    ],
                    filters: [
                        ['Boletos Emitidos', 'situacao', 'IN', busca_situacao_boleto]
                    ],
                    limit_page_length: 0,
                    as_list: true,
                },
                async: true,
                freeze: true,
                freeze_message: 'Aguarde<br/>Atualizando situação dos boletos<br/>Este processo pode demorar alguns minutos',
                callback(r) {
                    if(r.message) {
                        realizar_atualizacao_boleto(r.message);
                    }
                }
            });
		});
	}
}

function realizar_atualizacao_boleto(codigo_cobranca_array) {
	codigo_cobranca_array.forEach(function(codigo_cobranca_item) {
        //console.log(codigo_cobranca_item.codigo_cobranca);
        var conf_gerencianet = retorna_conf_plataforma_emissora(codigo_cobranca_item.plataforma_emissora);
        
		frappe.call({
			method: "boleto_bancario.boleto_bancario.doctype.boletos_emitidos.boletos_emitidos.realizar_atualizacao_boleto",
			args: {
				client_id: conf_gerencianet.client_id,
				client_secret: conf_gerencianet.client_secret,
				codigo_cobranca: codigo_cobranca_item.codigo_cobranca,
				name: codigo_cobranca_item.name,
			},
			async: true,
			freeze: true,
			freeze_message: 'Aguarde<br/>Atualizando situação dos boletos<br/>Este processo pode demorar alguns minutos',
			callback(response) {
				//
			}
		})
	})
}

function retorna_conf_plataforma_emissora(plataforma_emissora) {
	var retorno = null;

	if(plataforma_emissora == "Gerencianet") {
		var argumentos_retorno_doc = {
			doctype: 'Configurar Plataforma Gerencianet',
		};
		
		var doc_conf_gerencianet = retorna_doc(argumentos_retorno_doc);
		
		if(doc_conf_gerencianet.client_id && doc_conf_gerencianet.client_secret) {
			retorno = doc_conf_gerencianet;
		}
	}

	return retorno;
}

function retorna_doc(argumentos) {
    var retorno = null;
    frappe.call({
        method: "frappe.client.get",
        args: argumentos,
        async: false,
        callback(r) {
            if(r.message) {
                retorno = r.message;
            }
        }
    });
    
    return retorno;
}