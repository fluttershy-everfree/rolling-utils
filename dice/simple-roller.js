const SIMPLE_ROLLER = (({d, gg}, ROLLING) => {
	const DC = [
		{ id: 'unfailable'    , symbol: '☀️', label: "Immanquable"   , dc:  1 },
		{ id: 'very-easy'     , symbol: '🌤️', label: "Très facile"   , dc:  5 },
		{ id: 'easy'          , symbol: '⛅', label: "Facile"        , dc: 10 },
		{ id: 'moderate'      , symbol: '🌥️', label: "Modéré"        , dc: 15 },
		{ id: 'difficult'     , symbol: '☁️', label: "Difficile"     , dc: 20 },
		{ id: 'very-difficult', symbol: '🌧️', label: "Très difficile", dc: 25 },
		{ id: 'impossible'    , symbol: '⛈️', label: "Impossible"    , dc: 30 }
	];
	const TYPES = [
		/* adv */ {id: 'adv',
			prev: function(dc, mod, {length:die_size}) {
				const x = dc - mod;
				const xx = x*x;
				const slice = 2*x-1;
				return {f: xx-slice, m: slice, s: die_size*die_size - xx};
			},
			roll: (die) => {
				let rolls = [ ROLLING.r(die), ROLLING.r(die) ];
				return {rolls, kept_index: rolls.indexOf(rolls.reduce((a,v) => Math.max(a,v)))};
			}
		},
		/* str */{id: 'str',
			prev: function(dc, mod, {length:die_size}) {
				const x = dc - mod;
				return {f: x-1, m: 1, s: die_size - x};
			},
			roll: (die) => {
				return {rolls: [ ROLLING.r(die) ], kept_index: 0};
			}
		},
		/* dis */{id: 'dis',
			prev: function(dc, mod, {length:die_size}) {
				const x = dc - mod;
				const y = die_size + 1 - x;
				const yy = y*y;
				const slice = 2*y-1;
				return {f: die_size*die_size - yy, m: slice, s: yy-slice};
			},
			roll: (die) => {
				const rolls = [ ROLLING.r(die), ROLLING.r(die) ];
				return {rolls, kept_index: rolls.indexOf(rolls.reduce((a,v) => Math.min(a,v)))};
			}
		}
	];
	let $roller_dcs, $roller_ch, $roller_type, $roll_preview, $roller_outcome;
	let $roller_dc_value, $roller_mod_slider;
	let $mod_presets;
	const __meta = {
		dice: 20,
		type: 'str', // Advantage, Straight, Disadvantage
		mod: 0,
		get dc() { return +$roller_dc_value.value; },
		set dc(v) {
			$roller_dc_value.value = v;
			$roller_outcome.textContent = '';
		}
	};
	function set_type(type=TYPES[1]) {
		//gg(type, 'roller-type', type => type);
		__meta.type = type;
		$roller_outcome.textContent = '';
	}
	function set_mod(mod) {
		set_characteristic(undefined, mod, undefined, undefined);
	}
	function set_characteristic(ch, mod, color, shape) {
		$roller_ch.textContent = "";
		__meta.mod = +(mod??0);
		$roller_outcome.textContent = '';
		if (ch) {
			$roller_ch.classList.remove('empty');
		} else {
			$roller_ch.classList.add('empty');
		}
		const r = d({t: 'span', c: ['sub-roll']});
		if (ch ) { r.setAttribute( 'ch',  ch); }
		if ($roller_mod_slider.value != __meta.mod) {
			$roller_mod_slider.value = __meta.mod;
		}
		$roller_mod_slider.style.setProperty('--mod', __meta.mod);
		if (__meta.mod > 0) { $roller_mod_slider.classList.add('positive'); }
		else { $roller_mod_slider.classList.remove('positive'); }
		if (__meta.mod < 0) { $roller_mod_slider.classList.add('negative'); }
		else { $roller_mod_slider.classList.remove('negative'); }
		if (mod) {
			r.setAttribute('mod', `${__meta.mod < 0 ? '' : '+'}${__meta.mod}`);
		} else {

		}
		if (color) { r.style.setProperty('--color', color); }
		if (shape) {
			r.classList.add('shaped-ends--before');
			if (typeof shape === 'string') {
				r.classList.add("shape-"+shape+"-left--before" );
				r.classList.add("shape-"+shape+"-right--before");
			} else {
				const {left, right} = shape;
				if (left ) { r.classList.add("shape-"+left +"-left--before" ); }
				if (right) { r.classList.add("shape-"+right+"-right--before"); }
			}
		}
		$roller_ch.append(r);
	}
	function preview(type, die=ROLLING.DICE.d20) {
		if (!type) {
			$roll_preview.classList.remove('active');
			['--f', '--m', '--s', '--t'].forEach(prop => $roll_preview.style.removeProperty(prop));
			return;
		}
		$roll_preview.classList.add('active');

		const die_size = die.length;
		const {mod, dc} = __meta;
		const x = dc - mod;
		const {f, m, s} = (x < 1) ? {f:0, m:0, s:1} : (x > die_size) ? {f:1, m:0, s:0} : type.prev(dc, mod, die);
		const props = {'--f': f, '--m': m, '--s': s, '--t': f+m+s};
		for (const prop in props) { $roll_preview.style.setProperty(prop, props[prop]); }
	}
	function roll(die=ROLLING.DICE.d20) {
		const {type, mod, dc} = __meta;
		const {rolls, kept_index} = type.roll(die);
		const dice = rolls.map((v,i) => ROLLING.die_roll(die, v, (i === kept_index)));

		$roller_outcome.textContent = '';
		$roller_outcome.append(d({t:'span', c:['roll-dice-array'], ch:dice.map(({value, type, dismissed}) => d({
			t:'span', p:{textContent: value}, c:['roll-die'], a:{type, dismissed}
		}))}));
		if (mod) {
			$roller_outcome.append(d({t:'span',
				p:{textContent:`${(mod < 0 ? -mod : mod)}`},
				c:['roll-mod'],
				a:{negative:(mod < 0)}
			}));
		}
		const outcome = (dice[kept_index].value + mod);
		$roller_outcome.append(d({t:'span', p:{textContent:outcome}, c:['roll-total'], a:{type: dice[kept_index].type}}));
		const verdict = ROLLING.dc_verdict(dc, outcome);
		$roller_outcome.append(d({t:'span', p:{textContent: verdict.label}, c:['roll-verdict'], a:{verdict: verdict.id}}));
	}
	function reset() {
		__meta.dc = 10;
		set_type();
		set_characteristic();
		$roller_outcome.textContent = '';
	}
	function setup_presets(PRESETS) {
		const MAIN_SHAPE = "chevron";
		const SUB_SHAPE = {left: "dflat", right: "chevron"};
		$mod_presets.textContent = '';
		PRESETS.forEach(({label, hint, default_mod, color, subs}) => {
			$mod_presets.append(d({c:['roll-cat'], s:{'--color': color}, ch:[
				// d({t:'span', p:{textContent:label}, c:['label'], a:{title:hint}}),
				d({
					c:['main-roll', 'ch', "shaped-ends--before"],
					a:{title:hint, ch:label, mod:default_mod, 'shape-right--before': MAIN_SHAPE},
					e:{click: () => set_characteristic(label, default_mod, color, { right: MAIN_SHAPE })}
				}),
				d({c:['sub-rolls', 'ch'], ch:subs.map(
					({sub, mod, color:spec_color}) => d({
						c:['sub-roll', 'ch', "shaped-ends--before"],
						a:{ch:sub, mod, 'shape-left--before': SUB_SHAPE.left, 'shape-right--before': SUB_SHAPE.right},
						e:{click: () => set_characteristic(sub, mod, spec_color??color, SUB_SHAPE)}
					})
				)})
			]}));
		});
	}
	return {
		DC, TYPES,
		roll,
		setup() {
			const section = d({c:['section'], a:{id:'simple-rolling'}, ch:[
				d({c:['title'], p:{textContent:"🎲Jet de dé"}}),
				d({c:['roller'], ch:[
					d({c:['settings'], ch:[
						d({c:['sub-section', 'dc'], ch:[
							d({c:['label'], p:{textContent:'Difficulté'}}),
							$roller_dcs = d({c:['dcs'], ch:[
								$roller_dc_value = d({t:'input', c:['value', 'framed'], a:{type:'text', name:'dc'}})
							]})
						]}),
						d({c:['sub-section', 'mod'], ch:[
							d({c:['label'], p:{textContent:'Modificateur'}}),
							$roller_mod_slider = d({t:'input', c:['slider'],
								a:{type:'range', min:-10, max:10},
								e:{ input: function() { set_mod(this.value); }, change: function() { set_mod(this.value); } }
							}),
							$roller_ch = d({c:['ch', 'erasable'], e:{click:() => set_characteristic()}}),
						]}),
						$roller_type = d({c:['roll-types'], ch:[
							...TYPES.map(type => d({t:'button',
								c:['roll-type'],
								a:{'type': type.id},
								e:{
									click: () => { set_type(type); roll(ROLLING.DICE.d20); },
									mouseenter: () => preview(type, ROLLING.DICE.d20),
									mouseleave: () => preview()
								}
							}) ),
							$roll_preview = d({c:['previews'], ch:[
								d({c:['preview', 'success', 'framed', '-thin']}),
								d({c:['preview', 'meet', 'framed', '-thin']}),
								d({c:['preview', 'failure', 'framed', '-thin']})
							]})
						]})
					]}),
					$roller_outcome = d({c:['outcome', 'roll-display', 'framed', 'erasable'], e:{click:() => ($roller_outcome.textContent = '')}})
				]}),
				$mod_presets = d({c:['mod-presets']})
			]});
			DC.forEach(({id, symbol, label, dc}) => {
				$roller_dcs.append(d({
					p:{textContent:symbol},
					c:['preset'],
					a:{title:(label + ' ('+dc+')'), preset:id},
					e:{click: () => { __meta.dc = dc; }}
				}))
			});



			window.addEventListener("dragover", (e) => {
				e.preventDefault();
				(!e.handler && (e.dataTransfer.dropEffect = "none"));
			});

			(() => {
				function anyFile(e) {
					return [...e.dataTransfer.items].some( ({kind}) => (kind === "file") );
				}
				function getFiles(e) {
					return [...e.dataTransfer.items].filter( ({kind}) => (kind === "file") );
				}
				section.addEventListener('dragenter', (e) => {
					if (section.contains(e.target)) { section.classList.add('dragover'); }
				});
				section.addEventListener('dragleave', (e) => {
					if (!section.contains(e.relatedTarget)) { section.classList.remove('dragover'); }
				});
				section.addEventListener("drop", (e) => (anyFile(e) && e.preventDefault()));
				section.addEventListener("dragover", (e) => {
					if (anyFile(e)) {
						e.preventDefault();
						e.dataTransfer.dropEffect = "copy";
						e.handler = section;
					}
				});
				function logFiles(files) {
					for (let file of files) {
						const reader = new FileReader();
						reader.onload = (event) => {
							try {
								const json = JSON.parse(event.target.result);
								setup_presets(json);
							} catch (e) {
								console.log('Invalid file.', e);
							}
						};
						reader.readAsText(file);
					}
				}
				function dropHandler(ev) {
					ev.preventDefault();
					const files = [...ev.dataTransfer.items]
						.map((item) => item.getAsFile())
						.filter((file) => file);
					logFiles(files);
				}
				section.addEventListener("drop", dropHandler);
			})();



			setTimeout(() => reset(), 1);
			return section;
		},
		setup_presets
	};
})(DOM, ROLLING);