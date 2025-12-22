const ORACLES = (({d, gg}, {r}) => {
	const VOID = {id:undefined, label:''};
	const OUTCOMES = [
		{ id:"no-and" , label:"Non et..."   },
		{ id:"no"     , label:"Non"         },
		{ id:"no-but" , label:"Non mais..." },
		{ id:"yes-but", label:"Oui mais..." },
		{ id:"yes"    , label:"Oui"         },
		{ id:"yes-and", label:"Oui et..."   }
	];
	const TABLE = [
		{ id: 'very-unlikely', outcomes: [0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,2,2,2,3,4], label: "Très peu plausible" },
		{ id: 'unlikely'     , outcomes: [0,0,0,1,1,1,1,1,1,1,1,2,2,2,2,3,3,4,4,5], label: "Peu plausible"      },
		{ id: 'neutral'      , outcomes: [0,0,1,1,1,1,1,1,2,2,3,3,4,4,4,4,4,4,5,5], label: "Neutre"             },
		{ id: 'likely'       , outcomes: [0,1,1,2,2,3,3,3,3,4,4,4,4,4,4,4,4,5,5,5], label: "Plausible"          },
		{ id: 'very-likely'  , outcomes: [1,2,3,3,3,4,4,4,4,4,4,4,4,4,4,5,5,5,5,5], label: "Très plausible"     }
	];
	let $oracles, $oracle_odds, $auguries;
	function divine(likeliness) {
		gg(likeliness, 'auguries', l=>OUTCOMES[r(l.outcomes)], 'augury');
	}
	function odds(likeliness) {
		gg(likeliness, 'oracle-odds', l=>l);
	}
	return {

		setup: () => {
			const section = d({c:['section'], a:{id:'oracle-rolling'}, ch:[
				d({c:['title'], p:{textContent:"🔮Oracle"}}),
				$oracles = d({a:{id:'oracles'}}),
				$auguries = d({a:{id:'auguries'}, ch:[
					$oracle_odds = d({a:{id:'oracle-odds'}})
				]})
			]});
			
			TABLE.forEach(likeliness => {
				const {id, label} = likeliness;
				$oracles.append(d({t:'button', p:{id: 'oracle-'+id, textContent: label}, c:['oracle'], a:{likeliness: id}, e:{
					click: () => divine(likeliness),
					mouseenter: () => odds(likeliness),
					mouseleave: () => odds()
				}}));
			});
			TABLE.forEach(({id, outcomes}) => {
				const ch = outcomes
					.reduce((odds, outcome) => (odds[outcome]++, odds), Array.from({length: 6}, () => 0))
					.map((spec_odds, outcome) => d({
						c:['oracle-augury-odds', 'framed', ...((spec_odds ===  0) ? ['never'] : (spec_odds === 20) ? ['always'] : [])],
						a:{augury: OUTCOMES[outcome].id, amount: spec_odds},
						s:{'--amount': spec_odds}
					}));
				$oracle_odds.append(d({p:{id: 'oracle-odds-'+id}, c:['oracle-odds'], ch}));
			});
			OUTCOMES.forEach(({id, label}) => $auguries.append(
				d({p:{id: 'augury-'+id, textContent: label}, c:['augury', 'framed'], a:{augury: id}, e:{click: () => divine()}})
			));
			return section;
		}
	};
})(DOM, ROLLING);
