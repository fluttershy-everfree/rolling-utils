const TABLE_ROLLER = (({d}, ROLLING) => {
	const TABLES = (() => {
		const LIST = [];
		const REGISTRY = new Map();
		const register = function(table) {
			LIST.push(table);
			REGISTRY.set(table.id, table);
		};
		/* Traduction de : https://oracle-rpg.com/wp-content/uploads/2022/08/Solo_Gaming_Tool_v1_OracleRPG.pdf */
		const ALTDRAW_AND_ORACLE_3 = { bonus_draw: [
			{ table: 'oracle_2_keyword', contraints: { type: 'value', allowed: [1,2,4,5,6,7,8,9,10,11,12] } },
			{ table: 'oracle_3_event' }
		] };
		register({ id: 'oracle_2_keyword', name: "Mots clé", possibilities: [
			{ collection: '♠️', values: [
				ALTDRAW_AND_ORACLE_3,
				"Choix, options, possibilités",
				"Peine, tramatisme, trahison",
				"Repos, récuperation, relaxation",
				"Débat, hostilité, conflit",
				"Aller de l'avant, départ, laisser derrière",
				"Mensonges, manipulaiton, ruse",
				"Emprisonnement, restriction, piège",
				"Peur, anxiété, cauchemard",
				"Désastre, ruine, mort",
				"Un(e) enfant, adolescent(e) ou PNJ mystéri(eux/euse)",
				"Une adulte ou aînée femme",
				"Un adulte ou aîné homme"
			]},
			{ collection: '♥️', values: [
				ALTDRAW_AND_ORACLE_3,
				"Amour, harmonie, amitié",
				"Communauté, rassemblement, célébration",
				"Apathie, indifférence, insatisfaction",
				"Perte, deuil, déception",
				"Nostalgie, histoire, passé",
				"Rêve, fantaisie, illusions",
				"Abandon, fuite, délaissement",
				"Contentement, satisfaction, réalisation",
				"Bonheur, joie, plénitude",
				"Un(e) enfant, adolescent(e) ou PNJ mystéri(eux/euse)",
				"Une adulte ou aînée femme",
				"Un adulte ou aîné homme"
			]},
			{ collection: '♣️', values: [
				ALTDRAW_AND_ORACLE_3,
				"Progrès, développement, amélioration",
				"Vision, prémonition, sagesse",
				"Cérémonie, fête, réception",
				"Compétition, rivalité, désaccord",
				"Succès, victoire, triomphe",
				"Défense, protection",
				"Excitation, exaltation, anticipation",
				"Persévérance, persistance, tenacité",
				"Fardeau, responsibilités, obligations",
				"Un(e) enfant, adolescent(e) ou PNJ mystéri(eux/euse)",
				"Une adulte ou aînée femme",
				"Un adulte ou aîné homme"
			]},
			{ collection: '♦️', values: [
				ALTDRAW_AND_ORACLE_3,
				"Changement, adaptation, altération",
				"Équipe, collaboration, effort",
				"Pouvoir, régence, influence",
				"Épruve, difficulté, perte",
				"Aide, charité, générosité",
				"Planification, patience, endurance",
				"Habileté, talent, expertise",
				"Finalité, dénouement, récompense",
				"Ascendance, tradition, héritage",
				"Un(e) enfant, adolescent(e) ou PNJ mystéri(eux/euse)",
				"Une adulte ou aînée femme",
				"Un adulte ou aîné homme"
			]}
		]});
		register({ id: 'oracle_3_event', name: "Événements", possibilities: [
			{ collection: '♠️', values: [
				"Objet mystérieux",
				"Événement mystérieux",
				"Ressource essentielle épuisée",
				"Malheur imminent",
				"Affaires douteuses",
				"Embuscade",
				"Enlèvement",
				"Réunion de travail",
				"Personnage du passé",
				"Événement inoportun",
				"Problème qui ressurgit",
				"Affaires officielles",
				"Sauv(eur/euse)"
			]},
			{ collection: '♥️', values: [
				"Bouc émissaire",
				"Religion",
				"Besoin de se cacher",
				"Conflit",
				"Escorte",
				"Juste cause, malmenée",
				"Confrontation",
				"Destruction",
				"Quelqu'un disparait",
				"Réunion rare ou unique",
				"Quelqu'un qui ne devrait pas être là",
				"Personne influente",
				"Information utile de source inconnue"
			]},
			{ collection: '♣️', values: [
				"Disgrâce",
				"Trouvaille oportune",
				"Catastrope",
				"Flagrant délit",
				"Découverte",
				"Réunion civile",
				"Comportement douteux",
				"Affrontement",
				"Apparition d'ennemis",
				"Blessure",
				"Nouvel ennemi",
				"Situation dangereuse",
				"Promesse de récompense"
			]},
			{ collection: '♦️', values: [
				"Réunion émouvante",
				"Mort",
				"Groupe en péril",
				"De l'aide, à un certain prix",
				"Injustice",
				"Confrontation",
				"Vol",
				"Filature",
				"Rencontre d'amis",
				"Appel à l'aide",
				"Nouvelle personne mystérieuse",
				"Dispute",
				"Fraude et tromperie"
			]}
		]});
		register({ id: 'oracle_4_role', name: "Rôle (Personnage)", possibilities: [
			{ collection: '♠️', values: [
				"Juge",
				"Criminel(le)",
				"Soign(eur/euse)",
				"Cherch(eur/euse)",
				"Érudit(e)",
				"Étrang(er/ère)",
				"Marchand(e)",
				"Collectionn(eur/euse)",
				"Agent",
				"Ambassa(deur/drice)",
				"Assassin",
				"Officiel(le) gouvernemental(e)",
				"Aventuri(er/ère)"
			]},
			{ collection: '♥️', values: [
				"Artiste de scène",
				"Historien(ne)",
				"Mage",
				"Officiel(le) militaire",
				"Rebel(le)",
				"Serviteur(e)",
				"Espion(ne)",
				"Patron(ne)",
				"Artisan(e)",
				"Méchant(e)",
				"Membre de gang",
				"Pari(eur/euse)",
				"Voyag(eur/euse)"
			]},
			{ collection: '♣️', values: [
				"Nouvel(le) Arrivant(e)",
				"Fugiti(f/ve)",
				"Force de l'ordre",
				"Célébrité",
				"Chass(eur/euse) de prime",
				"Explora(teur/trice)",
				"Prophète",
				"Cultiste",
				"Aubergiste",
				"Alchimiste",
				"Fermi(er/ère)",
				"Contrebandi(er/ère)",
				"Vaganbond(e)"
			]},
			{ collection: '♦️', values: [
				"Émissaire",
				"Mondain(e)",
				"Mercenaire",
				"Men(eur/euse)",
				"Mystique",
				"Artiste",
				"Chass(eur/eresse)",
				"Paria",
				"Hérétique",
				"Garde",
				"Inquê(teur/trice)",
				"Aristocrate",
				"Apprenti(e)/Étudient(e)"
			]}
		]});
		register({ id: 'oracle_5_personality', name: "Personnalité", possibilities: [
			{ collection: '♠️', values: [
				"Danger(eux/euse)",
				"Stoïque",
				"Intolérant(e)",
				"Amical(e)",
				"Rusé(e)",
				"Gentil(le)",
				"Pi(eux/euse)",
				"Insensible",
				"Sévère",
				"Méfiant(e)",
				"Cynique",
				"Irritable",
				"Nerv(eux/euse)"
			]},
			{ collection: '♥️', values: [
				"Paranoïaque",
				"Enjoué(e)",
				"Snob",
				"Malin(e)",
				"Audaci(eux/euse)",
				"Tenace",
				"Prudent(e)",
				"Colérique",
				"Agressi(f/ve)",
				"Avare",
				"Obnubilé(e)",
				"Discrt(et/ète)",
				"Espiègle/Malici(eux/euse)"
			]},
			{ collection: '♣️', values: [
				"Courag(eux/euse)",
				"Confiant(e)",
				"Génér(eux/euse)",
				"Agréable",
				"Apathique",
				"Critique",
				"Ment(eur/euse)",
				"Prétenti(eux/euse)",
				"Compatissant(e)",
				"Cru(e)",
				"Élitiste",
				"Charitable",
				"Laconique"
			]},
			{ collection: '♦️', values: [
				"Détendu(e)",
				"Sarcatique",
				"Distant(e)",
				"Déterminé(e)",
				"Malpoli(e)/Groissi(er/ère)",
				"Am(er/ère)",
				"Charmant(e)",
				"Énervé(e)",
				"Suspect(e)",
				"Violent(e)",
				"Cruel(le)",
				"Morose",
				"Fi(er/ère)"
			]}
		]});
		const decorator = (decoration) => ((option) => Object.assign(
			{value: option}, decoration
		));
		const draw_also = (table) => decorator({ bonus_draw: [ { table } ] });
		register({ id: 'oracle_7_adventure', name: "Aventure", possibilities: [
			{ collection: '♠️', values: [
				"Garder/Protéger ...",
				"S'immiscer dans ...",
				"Arrêter ...",
				"Protéger quelqu'un en lien avec ...",
				"Rassembler des informations à propos de ...",
				"Déjouer/Contourner ...",
				"Enquêter sur ...",
				"Infiltrer un groupe en lien avec ...",
				"Prêter assistance à ...",
				"Masquer/Dissimuler ...",
				"Détruire des plans en lien avec ...",
				"Empêcher ...",
				"Espionner ..."
			].map(draw_also('oracle_8_adv_event'))},
			{ collection: '♥️', values: [
				"Analyser ...",
				"Voler ...",
				"Transporter ...",
				"Cacher ...",
				"Livrer quelque part ...",
				"Livrer à quelqu'un ...",
				"Détruire ...",
				"Empêcher la livraison de ...",
				"Trouver la personne qui vend ...",
				"Trouver la personne qui veut acheter ...",
				"Trouver/Localiser ...",
				"Faire disparaître ...",
				"Protéger ..."
			].map(draw_also('oracle_9_adv_item'))},
			{ collection: '♣️', values: [
				"Escorter quelqu'un vers ...",
				"Attaquer ...",
				"Prendre et conserver ...",
				"Défendre ...",
				"Saccager ...",
				"Aider à fuir ...",
				"Trouver/Localiser ...",
				"Espionner ...",
				"Infiltrer ...",
				"Libérer ...",
				"Sauver des otages de ...",
				"Explorer ...",
				"Rapporter discrètement quelque chose vers ..."
			].map(draw_also('oracle_15_location'))},
			{ collection: '♦️', values: [
				"Protéger l'identité de ...",
				"Escorter ...",
				"Saboter les projets de ...",
				"Porter assistrance à ...",
				"Protéger ...",
				"Trouver/Localiser ...",
				"Captuer/Arrêter ...",
				"Surveiller ...",
				"Tuer/Assassiner ...",
				"Négocier avec/Soudoyer ...",
				"Masquer/Cacher ...",
				"Passer en douce ...",
				"Enquêter sur ..."
			].map(draw_also('oracle_4_role'))}
		]});
		register({ id: 'oracle_8_adv_event', name: "Événement (Aventure)", possibilities: [
			{ collection: '♠️', values: [
				"Une exécution",
				"Un site de fouilles",
				"Un combat organisé",
				"Une arrestation",
				"Un procès",
				"Un assassinat",
				"Un travail dangereux",
				"Une passation",
				"Un coup d'état",
				"Une rébellion",
				"Un complot criminel",
				"Le sabotage d'un événement",
				"Un affrontement"
			]},
			{ collection: '♥️', values: [
				"Des affaires douteuses",
				"Un emprisonnement",
				"Une expédition périlleuse",
				"Un assaut discret",
				"Un assaut bourrin",
				"Un meurtre/tentative",
				"Un événement mystique",
				"Une escroquerie",
				"Un vol",
				"Une innovation dans un nouveau domaine",
				"Traîtrise",
				"Une expérience magique",
				"Un événement prophétique"
			]},
			{ collection: '♣️', values: [
				"La récuperation d'un objet perdu",
				"Un sauvetage risqué",
				"La découverte d'un secret",
				"Un incident désastreux",
				"Une transformation",
				"Des actions secrètes",
				"Un événement céleste",
				"Un voyage vers un lieu important",
				"Un acte criminel",
				"Une attaque",
				"Une exploration",
				"Un rituel sacrificiel",
				"Un raid"
			]},
			{ collection: '♦️', values: [
				"Une découverte dangereuse",
				"Une catastrope",
				"Un enlèvement/tentative",
				"Une tentative de vengeance",
				"Une malédiction",
				"Un enchantement",
				"Une invocation",
				"Un complot politique",
				"Un rituel sinistre",
				"Une trève",
				"Une intrigue",
				"De la corruption",
				"Un phénomène magique"
			]}
		]});
		register({ id: 'oracle_9_adv_item', name: "Objet (Aventure)", possibilities: [
			{ collection: '♠️', values: [
				"Un objet de culte",
				"Un corps/cadavre",
				"De la marchandise",
				"Un médaillon inhabituel",
				"Un indice",
				"Des preuves de culpabilité",
				"Des preuves d'innocence'",
				"De l'agrent/Des richesses",
				"Un objet magique",
				"Une carte vers un endroit perdu",
				"Un message",
				"Un contenant scellé",
				"Des documents légaux"
			]},
			{ collection: '♥️', values: [
				"De la contrebande",
				"Un navire",
				"Une statue",
				"Une idole",
				"Un symbole d'autorité",
				"Un animal rare",
				"Un véhicule au chargmeent inhabituel",
				"Une arme importante/célèbre",
				"Une invention",
				"Une oeuvre célèbre",
				"Une monstre",
				"De sbijoux/pierres précieuses",
				"De la nourriture/des fournitures"
			]},
			{ collection: '♣️', values: [
				"Un objet d'outre-monde",
				"Des informations sensibles",
				"Un faux",
				"Une lettre",
				"Un objet dangereux",
				"Un livre ou savoir magique",
				"Une créature exotique",
				"Un indice sur un mystère ancien",
				"Un portail magique",
				"Une preuve de traîtrise",
				"Un objet apparemment banal",
				"Des fournitures",
				"Une carte au trésor"
			]},
			{ collection: '♦️', values: [
				"Une cache d'armes",
				"Une clé importante",
				"Un objet convoité",
				"Un objet historique",
				"Un trésor perdu",
				"Un ouvrage célèbre",
				"Des preuves d'un secret terrible",
				"Des documents gouvernementaux",
				"Un accord commercial",
				"Un texte prophétique",
				"Une preuve de culpabilité",
				"Une relique",
				"Un artéfact"
			]}
		]});
		register({ id: 'oracle_15_location', name: "Lieu", possibilities: [
			{ collection: '♠️', values: [
				"Une place gardée",
				"Une ruine",
				"Une mine",
				"Une repère criminel",
				"Un fort",
				"Un avant-poste",
				"Un lieu de culte",
				"Un campement",
				"Un abris",
				"Le territoire d'un gang",
				"Un taudis",
				"Un laboratoire",
				"Une tour"
			]},
			{ collection: '♥️', values: [
				"Un bâtiment officiel",
				"Un chantier",
				"Une entrepôt de contrebandiers",
				"Un convoi marchand",
				"Un crête gardée",
				"Un passage/Une brèche",
				"Un campement",
				"Un marais inhabité",
				"Un temple",
				"Un champ de bataille",
				"Une forteresse",
				"Un repère souterrain",
				"Un endroit ravagé"
			]},
			{ collection: '♣️', values: [
				"Un manoir",
				"Une ancienne cathédrale",
				"Une caverne",
				"Une prison",
				"Un village détruit",
				"Une petite ville",
				"Un navire",
				"Des égoûts",
				"Une épave",
				"Une ville abandonnée",
				"Une chambre-forte",
				"Un site de fouilles",
				"Un entrepôt"
			]},
			{ collection: '♦️', values: [
				"Un campement hostile",
				"Une place forte cirminelle",
				"Un endroit caché",
				"Un bosquet/des champs",
				"Un lieu historique",
				"Un laboratoire abandonné",
				"Un pont",
				"Un campement militaire",
				"Une cachette gardée",
				"Un quartier ravagé par le crime",
				"Un port",
				"Une place marchande",
				"Une cachette criminelle"
			]}
		]});
		return { LIST, REGISTRY }
	})();
	function clear_descendents(node) {
		if (!node._.next) { return; }
		const next = [...node._.next];
		while (next.length) {
			const node = next.shift();
			node.remove();
			if (node._.next) { next.push(...node._.next); }
		}
		node._.next = [];
	}
	function action(id, symbol, label, func) { return ({id, symbol, label, func}); }
	const ACTIONS = {
		reroll: action('reroll', 'R', "Relancer", function(node) {
			clear_descendents(node);
			const {table, modifiers} = node._;
			const result = roll(table, modifiers);
			const label = node.firstChild;
			label.textContent = '';
			const base_text = (typeof result === 'string' ? result : result?.value);
			const hoverRef = function(node, index, do_hover) {
				const {classList} = node._.next[index];
				if (do_hover) { classList.add('card-ref-hover'); }
				else { classList.remove('card-ref-hover'); }
			};
			const nodeRef = (node, index) => d({t:'span', p:{textContent:(index+1)}, c:['card-ref', 'framed', '-darkest'], e:{
				mouseenter: () => hoverRef(node, index, true),
				mouseleave: () => hoverRef(node, index, false)
			}});
			let i = 0;
			if (base_text) {
				const split_text = base_text.split(/(?=\.{3})|(?<=\.{3})/);
				split_text.forEach(part => label.append(
					(part !== '...') ? document.createTextNode(part) : nodeRef(node, i++)
				));
			}
			const refs = result?.bonus_draw?.length ?? 0;
			while (i < refs) {
				if (i > 0 || !!base_text) {
					label.append(document.createTextNode(' '));
				}
				label.append(nodeRef(node, i++));
			}
			if (result?.bonus_draw) {
				for (let bonus_draw of result.bonus_draw) {
					add(TABLES.REGISTRY.get(bonus_draw.table), bonus_draw.contraints, node);
				}
			}
		}),
		void: action('void', '/', "Vider", function(node) {
			clear_descendents(node);
			node.firstChild.textContent = '';
		}),
		remove: action('remove', 'X', "Supprimer", function(node) {
			clear_descendents(node);
			node.remove();
		})
	};

	let $$tables_list, $table_rolls;
	function add(table, modifiers, parent) {
		const order = (parent ? 1+parent._.order : 0);
		const div = d({
			p:{_:{ table, modifiers, next:[], parent, order }},
			c:['table-roll', 'framed'],
			a:Object.assign({table:table.name}, order ? {order:(1+parent._.next.length)} : undefined),
			s:{'--order':order},
			ch:[d({t:'span', c:['label'], a:{default:table.name}})]
		});

		const actions = [ACTIONS.reroll, ACTIONS.void, ACTIONS.remove];
		if (parent) { actions.pop(); }
		div.append(
			d({
				c:['table-roll-actions'],
				ch:actions.map(
					({id, symbol, label, func}) => d({
						t:'button',
						p:{textContent:symbol},
						c:['table-roll-action'],
						a:{action:id, title:label},
						e:{click: () => func(div)}
					})
				)
			})
		);
		if (parent) {
			let after = parent;
			while (after._.next.length) {
				after = after._.next[after._.next.length-1];
			}
			parent._.next.push(div);
			after.after(div);
		} else {
			$table_rolls.append(div);
		}
		ACTIONS.reroll.func(div);
	};
	function roll(table, modifiers) {
		const collection = ROLLING.r(table.possibilities);
		const value = ROLLING.r(collection.values);
		return value;
	}
	return {
		add,
		roll,
		setup() {
			const section = d({c:['section'], a:{id:'table-rolling'}, ch:[
				d({c:['title'], p:{textContent:"🔮Tables"}}),
				$tables_list = d({c:['tables-list']}),
				$table_rolls = d({c:['table-rolls']})
			]});
			TABLES.LIST.forEach((table) => $tables_list.append(d({
				t:'button',
				p:{textContent: table.name},
				c:['table'],
				e:{click:() => add(table)}
			})));
			return section;
		}
	};
})(DOM, ROLLING)