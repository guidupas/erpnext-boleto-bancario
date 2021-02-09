// Copyright (c) 2021, Inova Techy and contributors
// For license information, please see license.txt

frappe.ui.form.on('Emitir Boletos por Cliente', {
	onload(frm) {		
		if(verificar_conf_plataforma_emissora(frm.doc.plataforma_emissora) == 0) {
			alert("Plataforma de emissão de boletos não configurada");
		}
	}
});

function verificar_conf_plataforma_emissora(plataforma_emissora) {
	var config_ok = 1;

	if(plataforma_emissora == "Gerencianet") {
		var argumentos_retorno_doc = {
			doctype: 'Configuracao da plataforma Gerencianet',
			//name: 'client_id',
		};
		
		var doc_configuracoes_gerencianet = retorna_doc(argumentos_retorno_doc);
		
		if(!doc_configuracoes_gerencianet.client_id || !doc_configuracoes_gerencianet.client_secret) {
			config_ok = 0;
		}
		
		//console.log("------------------------------------------------");
		//console.log(doc_configuracoes_gerencianet);
		//console.log(doc_configuracoes_gerencianet.client_id);
		//console.log(doc_configuracoes_gerencianet.client_secret);
	}

	return config_ok;
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