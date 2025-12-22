const KEYWORDS = (({d}, {r}) => {
	const DEFAULT_REFINER = (v) => ([{label:(v.label??v), highlight: false, exclude: false}]);
	function action(id, symbol, label, func) { return ({id, symbol, label, func}); }
	let $keywords_actions, $keywords_mass_actions, $words;
	const ACTIONS = {
		reroll: action('reroll', 'R', "Relancer", function(node) {
			const {list, refiner} = node._.category;
			const rvs = (refiner??DEFAULT_REFINER)(r(list));
			node.firstChild.textContent = '';
			rvs.forEach(({label, highlight, exclude}) => node.firstChild.append(
				d({t:'span', p:{textContent:label}, a:{highlight, exclude}})
			))
		}),
		void  : action('void'  , '/', "Vider"    , function(node) { node.firstChild.textContent = '-'; }),
		remove: action('remove', 'X', "Supprimer", function(node) { node.remove(); }),
		mass: function({func}) {
			[...$words.children].forEach(func);
		}
	};
	const actions = [ACTIONS.reroll, ACTIONS.void, ACTIONS.remove];
	ACTIONS.add = function(category) {
		const {symbol, prefix, color} = category;
		const div = d({ p:{_:{category}}, c:['word', 'framed'], a:{symbol, prefix}, s:{'--color': color}, ch:[d({t:'span', c:['label']})] });
		div.append(
			d({
				c:['keyword-actions'],
				ch:actions.map(
					({id, symbol, label, func}) => d({
						t:'button',
						p:{textContent:symbol},
						c:['keyword-action'],
						a:{action:id, title:label},
						e:{click: () => func(div)}
					})
				)
			})
		);
		ACTIONS.reroll.func(div);

		$words.append(div);
	};
	return {
		setup(LISTS=[]) {
			/* LISTS = [
				{ id: 'whatever' , symbol: '✨', prefix: '+*+' , label: "Divination", color: '#ab9df2', list: [
					***values***
				], refiner: (picked_value) => [{label, highlight, exclude}, ...] }

				highlight : le mot sera mis en évidence (gras)
				exclude : le mot sera mis en retrait (rayé)
				
				Exemple de refiner sur une liste contenant des listes de termes : (several_words) => {
					// Fonction de pick aléatoire 
					const r = (c) => c[Math.floor(Math.random()*c.length)];
					// Résolution d'un terme avec une portion irrésolue (choix féminin/masculin notamment)
					// typiquement : ["attentes" , "joueu(:r|se)" , "symboliquement"],
					const roll_label = (l) => l.split(/[()]/).map(part => (
						(part[0] !== ':') ? part : r(part.slice(1).split('|'))
					)).join('');
					const l = several_words.length;
					// Pick un des mots
					const r0 = Math.floor(Math.random() * l);
					// Pick un autre mot (distinct)
					const r1 = ( r0 + Math.floor(Math.random() * (l-1)) + 1 )%l;
					return several_words.map((l,i) => ({ label:roll_label(l), highlight:(i===r0), exclude:(i===r1) }));
				}
			*/
			const section = d({c:['section'], a:{id:'keywords-roll'}, ch:[
				d({c:['title'], p:{textContent:"Mots"}}),
				$keywords_actions = d({a:{id:'keywords-actions'}}),
				$keywords_mass_actions = d({a:{id:'keywords-mass-actions'}}),
				$words = d({a:{id:'words'}})
			]});
			LISTS.forEach((category) => {
				let {symbol, label, list} = category;
				if (!list?.length) { return; }
				$keywords_actions.append(d({
					t: 'button',
					p:{textContent:label},
					c:['keyword-action'],
					a:{symbol},
					e:{click:() => ACTIONS.add(category)}
				}));
			});
			[ACTIONS.reroll, ACTIONS.void, ACTIONS.remove].forEach(action => {
				let { id, symbol, label } = action;
				$keywords_mass_actions.append(d({
					t:'button',
					c:['keyword-action'],
					a:{action:id},
					e:{click:() => ACTIONS.mass(action)},
					ch: [
						d({t:'span', p:{textContent:symbol}, c:['symbol']}),
						d({t:'span', p:{textContent:label}, c:['label']}),
					]
				}));
			});
			return section;
		}
	};
})(DOM, ROLLING);


