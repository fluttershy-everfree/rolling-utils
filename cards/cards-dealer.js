const CARDS_DEALER = (({d}) => {
	const CARDS_TYPES = [
		{ id: '32', colours: ['♠️','♥️','♣️','♦️'], values: ['A',                          '7', '8', '9', '10', 'V',      'D', 'R']},
		{ id: '54', colours: ['♠️','♥️','♣️','♦️'], values: ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'V',      'D', 'R']},
		{ id: '58', colours: ['♠️','♥️','♣️','♦️'], values: ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'V', 'C', 'D', 'R']},
		{ id: 'tarot',
			colours: ['⚔️','🏆','🪙','🪄'],
			values: ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'V', 'C', 'D', 'R'],
			special: {
				symbol: '🃏',
				values: ['✋', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21']
			}
		}
	];
	function draw_card(type) {
		const regular = type.colours.length * type.values.length;
		const special = (type.special?.values.length??0)
		const card = Math.floor(Math.random()*(regular + special));

		return (card < regular)
			? {
				colour: type.colours[card%(type.colours.length)],
				value: type.values[Math.floor(card/(type.colours.length))]
			} : {
				colour: type.special.symbol,
				value: type.special.values[card - regular]
			};
	};
	let outcome;
	function deal(set=CARDS_TYPES[0]) {
		const card = draw_card(set);
		$outcome.textContent = '';
		$outcome.append(d({
			a:card,
			c:['card-deal', 'framed', '-thin'],
			// p:{textContent:(card.colour + card.value)}
		}));
	};
	const __meta = { set: CARDS_TYPES[0] };
	return {
		OUTCOME_CONTAINER: 'deal-outcome',
		setup() {
			return d({c:['section'], a:{id:'cards-dealing'}, ch:[
				d({c:['title'], p:{textContent:"Tirage de carte"}}),
				d({a:{id:'card-dealing'}, ch:[
					d({t:'select',
						e:{'change': (e) => { __meta.set = CARDS_TYPES.find(type => (type.id === e.target.value)) }},
						ch:CARDS_TYPES.map(type => d({t:'option',a:{value:type.id, label:type.id}}))
					}),
					d({t:'button', p:{textContent:"🃏"}, c:['do-deal', 'framed'], e:{click:() => deal(__meta.set)}}),
					$outcome = d({c:['outcome']})
				]})
			]});
		}
	};
})(DOM);