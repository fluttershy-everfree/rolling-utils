const TRAITS_ROLLER = (({d}, ROLLING) => {
	function cancel_opposites(die, pool_rolls, policy) {
		if (policy === 'ignore') { return []; }
		const matchesPolicy = (policy === 'extremes')
			? (die_roll) => (!!die_roll.type)
			/* 'all' */
			: (die_roll) => (true);
		return pool_rolls.map((die_roll, i) => {
			if (die_roll.dismissed || !matchesPolicy(die_roll)) { return null; }
			const opposite = die.length + 1 - die_roll.value;
			const opposite_roll = pool_rolls.find((other_roll, j) => (
				(j>i) && (!other_roll.dismissed) && (other_roll.value === opposite)
			));
			if (opposite_roll) {
				die_roll.dismissed = 'opposed';
				opposite_roll.dismissed = 'opposed';
				return [die_roll, opposite_roll];
			}
			return null;
		}).filter(e=>e);
	}
	function cancel_common(positive_roll, negative_roll, policy) {
		if (policy === 'ignore') { return []; }
		const matchesPolicy = (policy === 'extremes')
			? (die_roll) => (!!die_roll.type)
			/* 'all' */
			: (die_roll) => (true);
		return positive_roll.map((die_roll) => {
			if (die_roll.dismissed || !matchesPolicy(die_roll)) { return null; }
			const matching_roll = negative_roll.find((other_roll) => (
				(!other_roll.dismissed) && (other_roll.value == die_roll.value)
			));
			if (matching_roll) {
				die_roll.dismissed = 'negated';
				matching_roll.dismissed = 'negated';
				return [die_roll, matching_roll];
			}
			return null;
		}).filter(e=>e);
	}
	function roll_dice_pools(die, {positive, negative}, policies) {
		const rolls = {
			positive: Array.from({length: positive}, (v,i,a) => ROLLING.die_roll(die, ROLLING.r(die), true)),
			negative: Array.from({length: negative}, (v,i,a) => ROLLING.die_roll(die, ROLLING.r(die), true))
		};
		const cancelled_opposites = [
			...cancel_opposites(die, rolls.positive, policies.positive?.opposites),
			...cancel_opposites(die, rolls.negative, policies.negative?.opposites)
		];
		const cancelled_homologues = cancel_common(rolls.positive, rolls.negative, policies.common.opposites);
		return {
			rolls,
			cancelled: {opposites: cancelled_opposites, homologues: cancelled_homologues}
		};
	}
	const __meta = {
		die: ROLLING.DICE.d12,
		pools: {
			positive: 1,
			negative: 0
		},
		policies: {
			positive: { opposites: 'all' },
			negative: { opposites: 'all' },
			common: { opposites: 'all' }
		}
	};
	const POLICIES = [
		{ id: 'ignore'  , label: "Aucune"  },
		{ id: 'extremes', label: "Min/max" },
		{ id: 'all'     , label: "Tout"    }
	];

	let $pool_roller_settings, $pool_roller_outcome;
	function roll() {
		const {rolls, cancelled} = roll_dice_pools(__meta.die, __meta.pools, __meta.policies);
		const map = new Map();
		rolls.positive.forEach(die_roll => map.set(die_roll, new Set()));
		rolls.negative.forEach(die_roll => map.set(die_roll, new Set()));
	
		$pool_roller_outcome.textContent = '';
		const render_pool = pool => d({ t:'span', c:['roll-dice-array'], ch:pool.map(render_die_roll) });
		const render_die_roll = die_roll => {
			const node = render_node(die_roll);
			map.get(die_roll).self = node;
			map.get(die_roll).add(node);
			return node;
		};
		const render_node = die_roll => {
			const {value, type, dismissed} = die_roll;
			return d({ t:'span', c:['roll-die'], a:{type, dismissed},
				e:{mouseenter:() => hover(die_roll, true), mouseleave:() => hover(die_roll, false)},
				ch:[d({t:'span', p:{textContent: value}})]
			});
		};
		const hover = (die_roll, onoff) => {
			if (onoff) { map.get(die_roll).forEach(node => node.classList.add('hover')); }
			else { map.get(die_roll).forEach(node => node.classList.remove('hover')); }
		};
		$pool_roller_outcome.append(render_pool(rolls.positive));
		if ((__meta.policies.common.opposites != 'ignore') && rolls.negative.length) {
			$pool_roller_outcome.append(d({t:'span', c:['roll-mod'], a:{negative:true}}));
			$pool_roller_outcome.append(render_pool(rolls.negative));
		}
		// Call after render_pool to do the linking
		[cancelled.opposites, cancelled.homologues].forEach(pairing => pairing.forEach(([a,b]) => {
			a = map.get(a); b = map.get(b);
			a.add(b.self); b.add(a.self);
		}));

		$pool_roller_outcome.append(d({t:'span', c:['roll-total']}));
		$pool_roller_outcome.append(d({t:'span', c:['roll-dice-array'],
			ch:rolls.positive.filter(({dismissed}) => !dismissed)
				.map(die_roll => {
					const node = render_node(die_roll);
					map.get(die_roll).add(node);
					return node;
				})
		}));
	};
	return {
		POLICIES,
		__meta,
		roll,
		setup() {
			const section = d({c:['section'], a:{id:'pool-rolling'}, ch:[
				d({c:['title'], p:{textContent:"🎲Jet de dés en masse"}}),
				d({c:['roller'], ch:[
					$pool_roller_settings = d({c:['settings']}),
					$pool_roller_outcome = d({c:['outcome', 'roll-display', 'framed']})
				]})
			]});
			const policies_settings = [
				{ id: 'positive', label: "Opposés positifs" },
				{ id: 'negative', label: "Opposés négatifs" },
				{ id: 'common'  , label: "Valeurs communes" }
			].map((type) => d({
				c:['cancellation-policy', 'entry', 'framed', '-thin'],
				ch:[
					d({t:'span', p:{textContent:type.label}, c:['label']}),
					...POLICIES.map((policy) => d({
						t:'input',
						c:['option'],
						a:{type:'radio', name: 'pool-policy--'+type.id},
						e:{change:() => (__meta.policies[type.id].opposites = policy.id)}
					}))
				]
			}));
			$pool_roller_settings.append(d({
				c:['cancellation-policies', 'sub-section'],
				ch:[
					d({t:'span', c:['label'], p:{textContent:"Annulations"}}),
					d({c:['options'],
						ch:POLICIES.map((policy) => d({t:'span', p:{textContent:policy.label}, c:['option-label']}))
					}),
					...policies_settings
				]
			}));
			const pools = [
				{ id: 'positive', label: "Positifs", min: 1 },
				{ id: 'negative', label: "Négatifs", min: 0 }
			];
			$pool_roller_settings.append(d({
				c:['pools', 'sub-section'],
				ch:[
					d({t:'span', c:['label'], p:{textContent:"Dés"}}),
					...pools.map((pool) => {
						const label = d({t:'span',p:{textContent:pool.label}, c:['label']});
						const value_label = d({t:'span',p:{textContent:__meta.pools[pool.id]}, c:['slider-value']});
						const applyValue = () => {
							const value = +slider.value;
							value_label.textContent = value;
							__meta.pools[pool.id] = value;
						};
						const slider =  d({t:'input', c:['slider'],
							a:{type:'range', min:pool.min, max:12},
							e:{ input: applyValue, change: applyValue }
						});
						slider.value = __meta.pools[pool.id];
						return d({ c:['pool-amount', 'entry', 'framed', '-thin'], a:{pool:pool.id}, ch:[label, value_label, slider] });
					}),
					(() => {
						const label = d({t:'span',p:{textContent:"Taille"}, c:['label']});
						const value_label = d({t:'span',p:{textContent:'d'+__meta.die.length}, c:['slider-value']});
						const values = ['d2','d4','d6','d8','d10','d12','d20'].map(die => ROLLING.DICE[die]);
						const applyValue = () => {
							const value = values[+slider.value];
							value_label.textContent = 'd'+value.length;
							__meta.die = value;
						};
						const slider =  d({t:'input', c:['slider'],
							a:{type:'range', min:0, max:(values.length-1)},
							e:{ input: applyValue, change: applyValue }
						});
						slider.value = values.indexOf(__meta.die);
						return d({ c:['pool-amount', 'entry', 'framed', '-thin'], a:{pool:'size'}, ch:[label, value_label, slider] });
					})()
				]
			}));
			$pool_roller_settings.append(d({
				t:'button', p:{textContent:"Lancer !"}, e:{click: () => roll()}
			}));
			return section;
		}
	};
})(DOM, ROLLING);