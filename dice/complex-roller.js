const COMPLEX_ROLLER = (({d}, ROLLING) => {
	function operator_subtype(key, {is_token}) {
		if (is_token) { return 'token'; }
		return /[a-z]/.test(key[0]) ? 'letter'
			: /[-+*%]/.test(key[0]) ? 'math'
			: /[,;()]/.test(key[0]) ? 'grouping'
			: undefined;
	}
	function render_prepared(node) {
		if (!node) { return undefined;}
		const {type, key, value, left, right} = node;
		const is_function = (type === 'function');
		const children = [];
		if (left && !is_function) {
			const left_group = render_prepared(left);
			if (left_group) {
				children.push(d({t:'span', c:['left'], ch:[left_group]}));
			}
		}
		if ((type === 'number') || (type === 'variable') || (type === 'string')) {
			children.push(d({t:'span', p:{textContent:value}, c:['value'], a:{type, value}}));
		} else {
			const subtype = (type !== 'operator') ? undefined : operator_subtype(key, node.value);
			children.push(d({t:'span', p:{textContent:key}, c:['key'], a:{type, subtype, key}}));
		}
		if (left && is_function) {
			const left_group = render_prepared(left);
			if (left_group) {
				children.push(d({t:'span', c:['left'], ch:[left_group]}));
			}
		}
		if (right) {
			const right_group = render_prepared(right);
			if (right_group) {
				children.push(d({t:'span', c:['right'], ch:[right_group]}));
			}
		}
		if (type === 'group') {
			const sub_group = render_prepared(value);
			if (sub_group) {
				children.push(d({t:'span', c:['sub'], ch:[sub_group]}));
			}
		}
		return d({t:'span', c:['node'], a:{type}, ch:children});
	}
	function render_node({node, result, left, right, sub}) {
		const children = [];
		const {type, key, value} = node ?? {};
		const is_function = (type === 'function');
		if (left && !is_function) { children.push(d({t:'span', c:['left'], ch:[render_node(left)]})); }
		if (node) {
			if ((type === 'number') || (type === 'variable') || (type === 'string')) {
				children.push(d({t:'span', p:{textContent:value}, c:['value'], a:{type, value}}));
			} else {
				const subtype = (type !== 'operator') ? undefined : operator_subtype(key, value);
				children.push(d({t:'span', p:{textContent:key}, c:['key'], a:{type, subtype, key}}));
			}
		}
		if (left && is_function) { children.push(d({t:'span', c:['left' ], ch:[render_node(left )]})); }
		if (right              ) { children.push(d({t:'span', c:['right'], ch:[render_node(right)]})); }
		if (sub                ) { children.push(d({t:'span', c:['sub'  ], ch:[render_node(sub  )]})); }
		return d({t:'span', c:['node'], a:{type}, ch:children});
	}
	function render_result(node) {
		while (((node.type === 'list') || (node.type === 'spread')) && (node.value.length === 1)) {
			node = node.value[0];
		}
		const {type, value, label} = node;
		const rp = (out) => Object.assign(out, { __meta: { represents: node } });
		switch (type) {
			case 'string': {
				return rp(d({ t:'span', c:['string'], a:{type},
					ch:[d({t:'span', p:{textContent:value}})]
				}));
			}
			case 'roll': {
				const roll_type = ((value === 1) ? 'min' : (value === node.dice) ? 'max' : '');
				const ch = [d({t:'span', p:{textContent: value}})];
				if (label) { ch.unshift(d({t:'span', c:['label'], p:{textContent:label}})); }
				return rp(d({ t:'span', c:['roll-die'], a:{type:roll_type}, ch }));
			}
			case 'number': {
				const ch = [d({t:'span', p:{textContent: value}})];
				if (label) { ch.unshift(d({t:'span', c:['label'], p:{textContent:label}})); }
				return rp(d({ t:'span', c:['number'], a:{type}, ch }));
			}
			case 'list': {
				return rp(d({ t:'span', c:['roll-dice-array'], ch:value.map(render_result) }));
			}
			case 'spread': {
				return rp(d({ t:'span', c:['roll-dice-spread'], ch:value.map(render_result) }));
			}
			case 'range': {
				return rp(d({ t:'span', c:['roll-dice-range'], ch:[
					d({ t:'span', p:{textContent: node.lower_bound}, c:['number']}),
					d({ t:'span', p:{textContent:'..'}, c:['key'], a:{type:'operator', subtype:undefined}}),
					d({ t:'span', p:{textContent: node.upper_bound}, c:['number']}),
				]}));
			}
		}
		return undefined;
	}
	const pattern = (() => {
		function skipping(root, matching, selector) {
			let tested_value = root;
			if (matching?.skip) {
				const {skip} = matching;
				while (tested_value && ((selector?.(tested_value)??tested_value)?.type in skip)) {
					const replacement_property = skip[tested_value.type];
					tested_value = tested_value[replacement_property];
				}
			}
			return tested_value;
		}
		const MATCHERS = (() => {
			const indexed_matchers = new Map();
			function test(node, matcher) {
				const pattern = {id: this.id, node, matcher: this};
				for (let {name, matching} of this.proto.properties) {
					if (!matching) { continue; }
					const tested_value = skipping(node[name], matching);
					if (matching.value) {
						if (tested_value !== matching.value) { return undefined; }
					} else if (matching.matcher) {
						const subpattern = matching.matcher.test(tested_value);
						if (!subpattern) { return undefined; }
						if (typeof subpattern === 'object') {
							pattern[name] = subpattern;
						}
					}
				}
				return pattern;
			}
			function depth() {
				let depth = 0;
				for (let {name, matching} of this.proto.properties) {
					if (!matching?.matcher?.depth) { continue; }
					const part_depth = matching.matcher.depth(this);
					if (part_depth >= depth) {
						depth = 1 + part_depth;
					}
				}
				return depth;
			}
			function index(id, proto_matcher) {
				indexed_matchers.set(id, { id, proto: proto_matcher, test, depth });
			}
			function indexed_matcher(id) {
				return {
					id,
					test(node) {
						if (!indexed_matchers.has(id)) { console.log('Missing matcher : ', id); }
						return indexed_matchers.get(id).test(node);
					},
					depth(that) {
						if (!indexed_matchers.has(id)) { console.log('Missing matcher : ', id); }
						const matcher = indexed_matchers.get(id);
						if (matcher === that) { return 0; }
						return matcher.depth();
					}
				};
			}
			function either_matcher(...matchers) {
				return {
					test(node, that) {
						for (let matcher of matchers) {
							const pattern = matcher.test(node, that);
							if (pattern) {
								return pattern;
							}
						}
						return undefined;
					},
					depth(that) { return matchers.reduce((a, v) => Math.max(a, v.depth(that)), 0); }
				};
			}
			function spread_matcher(matcher) {
				return { proto: {
					properties: [
						{ name:'type', matching: { value:'operator' } },
						{ name:'key', matching: { value: '...' } },
						{ name:'right', matching:{ matcher }}
					] },
					test, depth
				};
			}
			const reccur_matcher = { test(node, that) { return that.test(node, that); } };
			const none_matcher = { test(node) { return !node ? { id: '<void>' } : undefined; }, depth() { return 0; } };
			return {
				index,
				indexed: indexed_matcher,
				none() { return none_matcher; },
				either: either_matcher,
				reccur: reccur_matcher,
				spread: spread_matcher,
				test(node, matcher) {
					return indexed_matchers.get(matcher).test(node);
				},
				inspect() {
					indexed_matchers.forEach((matcher, id) => console.log(id, matcher.depth()));
				}
			};
		})();
		const meta_matcher = (({index, indexed, either, spread, homogenous, none, reccur}) => {
			const skip = {'group':'value'};
			index('variable', { properties:[ { name:'type', matching: {value:'variable'}} ] });
			index('number', { properties:[ { name:'type', matching: {value:'number'}} ] });
			index('simple-values', { properties:[
				{ name:'type', matching:{ value:'spread' }},
				{ name:'left', matching:{ skip, matcher:either( none(), indexed('number'), indexed('variable'), indexed('simple-values') )}},
				{ name:'right', matching:{ skip, matcher:either( none(), indexed('number'), indexed('variable'), indexed('simple-values') )}}
			] });
			index('simple-range', { properties:[
				{ name:'type', matching:{ value:'range' }},
				{ name:'left', matching:{ skip, matcher:either( none(), indexed('number'), indexed('variable') )}},
				{ name:'right', matching:{ skip, matcher:either( none(), indexed('number'), indexed('variable') )}}
			] });

			index('simple-selector', { properties: [
				{ name:'type', matching: { value:'selector' } },
				{ name:'left', matching: { skip, matcher: none() } },
				{ name:'right', matching: { skip, matcher: either( none(),
					indexed('number'), indexed('variable'), indexed('simple-range'), indexed('simple-values')
				)}}
			] });
			index('random-selector', { properties: [
				{ name:'type', matching: { value:'selector' } },
				{ name:'left', matching: { skip, matcher: none() } },
				{ name:'right', matching: { skip, matcher: either( none(),
					indexed('number'), indexed('variable'), indexed('simple-range'), indexed('simple-values'),
					indexed('simple-roll')
				)}}
			] });
			index('simple-roll', { properties: [
				{ name:'type', matching: { value:'operator' } },
				{ name:'key', matching: { value: 'd' } },
				{ name:'left', matching:{ skip, matcher:either( none(), indexed('number'), indexed('variable') )}},
				{ name:'right', matching:{ skip, matcher:either( none(), indexed('number'), indexed('variable') )}}
			] });
			index('spread-roll', { properties: [
				{ name:'type', matching: { value:'operator' } },
				{ name:'key', matching: { value: '...' } },
				{ name:'right', matching:{ skip, matcher:indexed('simple-roll') }}
			] });
			index('simple-filter', { properties: [
				{ name:'type', matching: { value:'operator' } },
				{ name:'key', matching: { matcher:{test: (key) => 'kpc'.includes(key) } } },
				{ name:'left', matching: { skip, matcher: either(
					none(),
					indexed('number'), indexed('variable'), indexed('simple-roll'), indexed('spread-roll'),
					indexed('simple-range'), indexed('simple-values')
				) }},
				{ name:'right', matching: { skip, matcher: either(
					none(),
					indexed('number'), indexed('variable'), indexed('simple-range'), indexed('simple-values'),
					indexed('simple-selector')
				) }}
			] });
			index('random-filter', { properties: [
				{ name:'type', matching: { value:'operator' } },
				{ name:'key', matching: { matcher:{test: (key) => 'kpc'.includes(key) } } },
				{ name:'left', matching: { skip, matcher: either(
					none(),
					indexed('number'), indexed('variable'), indexed('simple-roll'), indexed('spread-roll'),
					indexed('simple-range'), indexed('simple-values')
				) }},
				{ name:'right', matching: { skip, matcher: either(
					none(),
					indexed('number'), indexed('variable'), indexed('simple-range'), indexed('simple-values'),
					indexed('random-selector')
				) }}
			] });
			index('simple-sum', { properties: [
				{ name:'type', matching: { value:'operator' } },
				{ name:'key', matching: { matcher:{ test: (key) => '+-'.includes(key) } } },
				{ name:'left', matching: { skip, matcher: either(
					none(),
					indexed('number'), indexed('variable'), indexed('simple-roll'),
					indexed('simple-range'), indexed('simple-values'),
					indexed('simple-filter'),
					indexed('simple-sum')
				) }},
				{ name:'right', matching: { skip, matcher: either(
					none(),
					indexed('number'), indexed('variable'), indexed('simple-roll'),
					indexed('simple-range'), indexed('simple-values'),
					indexed('simple-filter'),
					indexed('simple-sum')
				) }}
			] });
			index('chained-filter', { properties: [
				{ name:'type', matching: { value:'operator' } },
				{ name:'key', matching: { matcher:{ test: (key) => 'kpc'.includes(key) } } },
				{ name:'left', matching: { skip, matcher: either(
					none(), indexed('simple-filter'), indexed('chained-filter')
				) }},
				{ name:'right', matching: { skip, matcher: either(
					none(),
					indexed('number'), indexed('variable'), indexed('simple-range'), indexed('simple-values'),
					indexed('simple-selector')
				) }}
			] });
			index('chained-random-filter', { properties: [
				{ name:'type', matching: { value:'operator' } },
				{ name:'key', matching: { matcher:{ test: (key) => 'kpc'.includes(key) } } },
				{ name:'left', matching: { skip, matcher: either(
					none(), indexed('random-filter'), indexed('chained-random-filter')
				) }},
				{ name:'right', matching: { skip, matcher: either(
					none(),
					indexed('number'), indexed('variable'), indexed('simple-range'), indexed('simple-values'),
					indexed('simple-roll'),
					indexed('random-selector')
				) }}
			] });


			index('list-of-chained-filter', { properties: [
				{ name:'type', matching: { value:'operator' } },
				{ name:'key', matching: { value: ',' } },
				{ name:'left', matching: { skip, matcher: either(
					none(), indexed('simple-filter'), indexed('chained-filter'),
					indexed('list-of-chained-filter')
				) }},
				{ name:'right', matching: { skip, matcher: either(
					none(), indexed('simple-filter'), indexed('chained-filter')
				) }}

			] });
			const all = either(
				none(),
				indexed('variable'),
				indexed('number'),
				indexed('simple-values'),
				indexed('simple-range'),
				indexed('simple-selector'),
				indexed('simple-roll'),
				indexed('simple-filter'),
				indexed('chained-filter'),
				indexed('simple-sum'),
				indexed('random-filter'),
				indexed('chained-random-filter'),
				indexed('list-of-chained-filter')
			);
			return either(all, spread(all));
		})(MATCHERS);
		
		function render(pattern, {node, result, left, right, sub}) {
			if (result.type === 'void') { return undefined; }
			const {type, key, value} = node;
			// indexed('simple-values'),
			if (pattern.id === 'simple-values') {
				return render_result(result);
			}
			// indexed('simple-range'),
			if (pattern.id === 'simple-range') {
				return render_result(result);
			}
			// indexed('simple-roll'),
			if (pattern.id === 'simple-roll') {
				return render_result(result);
			}
			// indexed('simple-selector'),
			// indexed('random-selector'),
			// indexed('simple-filter'),
			// indexed('chained-filter'),
			// indexed('simple-sum'),
			// indexed('random-filter'),
			// indexed('chained-random-filter'),
			/*"faire le render qui passe les résultats successif pour les rayer"
			"faire les mappings appropriés"
			"A NOTER : on veut juste les nombres rayés."
			"A NOTER : une valeur de filtre peut en éliminer plusieurs dans l'input."
				"savoir laquelle a éliminé quoi nécessite de recalculer l'implem"
				"surtout que seul le drop élimine ses cibles, le keep match ce qu'on garde"
				"juste highlight tout ce qui est éliminé suite à un filtre."
				"cas frustrant : le count. Impossible de savoir après coup quel éléments ont matché"
					"la liste n'est parfois même pas calculée"
				"cas limite : les filtres sur un range. impossible de rayer des nombres."
				IDEE : lors d'un filtre sur un range, si le résultat final est contigu, renvoyer un range?*/
			// Survol d'un opérateur : surbrillance de ce qui a été amputé.
			const children = [];
			const isfilter = 'kp'.includes(key);
			const __meta = { represents: result };
			if (left) {
				left = skipping(left, pattern.left, (outcome) => outcome.node);
				let left_group = render(pattern.left, left);
				if (left_group) {
					if ((key === ',') && (left.node.key === ',')) {
						children.push(...left_group.childNodes);
					} else {
						if (isfilter) {
							__meta.original = left_group.__meta?.original ?? left_group;
							__meta.ref = left_group.__meta.represents;
							__meta.original.__meta.has_filter = true;
						}
						children.push(d({t:'span', c:['left'], ch:[left_group]}));
					}
				}
			}
			// indexed('variable'),
			// indexed('number'),
			if ((type === 'number') || (type === 'variable') || (type === 'string')) {
				children.push(d({t:'span', p:{textContent:value}, c:['value'], a:{type, value}}));
			} else {
				const subtype = (type !== 'operator') ? undefined : operator_subtype(key, value);
				children.push(d({t:'span', p:{textContent:key}, c:['key'], a:{type, subtype, key}}));
			}

			if (right) {
				right = skipping(right, pattern.right, (outcome) => outcome.node);
				const right_group = render(pattern.right, right);
				if (right_group) {
					children.push(d({t:'span', c:['right'], ch:[right_group]}));
				}
			}
			if (sub) {
				sub = skipping(sub, pattern.sub, (outcome) => outcome.node);
				const sub_group = render(pattern.sub, sub);
				if (sub_group) {
					children.push(d({t:'span', c:['sub'], ch:[sub_group]}));
				}
			}
			let dom = d({t:'span', c:['node', pattern.id], a:{type}, ch:children});
			dom.__meta = __meta;
			if (isfilter) {
				__meta.original.__meta.last_filter = dom;
				children.slice(1).forEach(child => {
					child.addEventListener('mouseenter', () => highlight_values(__meta, true));
					child.addEventListener('mouseleave', () => highlight_values(__meta, false));
				});
			}
			return dom;
		}
		function ordered_list_diff(ref, other, common=true) {
			const consumed_indexes = new Set();
			return ref.value.filter(ref_value => common == other.value.some((other_value, i) => (
				(ref_value === other_value) && (!consumed_indexes.has(i)) && (consumed_indexes.add(i), true)
			)));
		}
		function highlight_values({original, ref, represents}, onoff) {
			for (let child of original.childNodes) {
				child.classList.remove("hover-dropped");
				child.classList.remove("hover-dropped-now");
				child.classList.remove("hover-kept-now");
				child.classList.remove("hover-kept");
			}
			if (onoff) {
				// intersections
				const cmmn_list_end = ordered_list_diff(original.__meta.represents, original.__meta.last_filter.__meta.represents);
				const cmmn_list_now = ordered_list_diff(ref, represents);
				const diff_list_now = ordered_list_diff(ref, represents, false);


				const kend_it = cmmn_list_end.values();
				let kend_value = kend_it.next();
				const know_it = cmmn_list_now.values();
				let know_value = know_it.next();
				const dnow_it = diff_list_now.values();
				let dnow_value = dnow_it.next();
				for (let child of original.childNodes) {
					const kept_til_end = (child.__meta.represents == kend_value.value);
					const kept_for_now = (child.__meta.represents == know_value.value);
					const dropped_now = !kept_for_now && (child.__meta.represents == dnow_value.value);
					if (kept_til_end) { kend_value = kend_it.next(); }
					if (kept_for_now) { know_value = know_it.next(); }
					if (dropped_now) { dnow_value = dnow_it.next(); }
					
					if (kept_til_end) { child.classList.add("hover-kept"); }
					else if (kept_for_now) { child.classList.add("hover-kept-now"); }
					else if (dropped_now) { child.classList.add("hover-dropped-now"); }
					else { child.classList.add("hover-dropped"); }
				}
			}
		}
		return {
			skipping,
			find(node) {
				const skip = [
					{ match: ({type, key}) => ((type === 'operator') && (key === '...')), jumpTo:'right' },
					{ match: ({type}) => (type === 'group'), jumpTo: 'value' }
				];
				let skipper;
				while (node && (skipper = skip.find(skipper => skipper.match(node)))) {
					node = node[skipper.jumpTo];
				}
				return meta_matcher.test(node);
			},
			render(pattern, outcome) {
				const skip = [
					{ match: ({type, key}) => ((type === 'operator') && (key === '...')), jumpTo:'right' },
					{ match: ({type}) => (type === 'group'), jumpTo: 'sub' }
				];
				let skipper;
				while (outcome && (skipper = skip.find(skipper => skipper.match(outcome.node)))) {
					outcome = outcome[skipper.jumpTo];
				}
				return render(pattern, outcome);
			}
		}
	})();
	const __meta = {
		default_variables: new Map(),
		prepared_roller: undefined,
		variables: undefined,
		rolled: undefined
	};

	function parse(input, pre_rendered, variables, meta) {
		const expr = input.value;
		try {
			meta.prepared_roller = ROLL.prepare(expr);
		} catch (e) {
			meta.prepared_roller = undefined;
		}
		// console.log(prepared);
		meta.rolled = undefined;
		meta.variables = new Map();
		// console.log(rolled);

		variables.textContent = '';
		pre_rendered.textContent = '';
		if (!meta.prepared_roller) { return; }
		if (meta.prepared_roller.variables) {
			for (let variable of meta.prepared_roller.variables) {
				const base_value = meta.default_variables.get(variable) ?? 0;
				meta.variables.set(variable, base_value);
				const input = d({t:'input', c:['value', 'framed', '-thin'], a:{type:'number', 'data-id':variable, placeholder:'<valeur>'}, e:{input:(e) => {
					const value = +e.target.value;
					meta.variables.set(variable, value);
					if (value) {
						meta.default_variables.set(variable, value);
					} else {
						meta.default_variables.delete(variable);
					}
					meta?.updated_variable(variable);
				}}});
				input.value = base_value;
				const variable_element = d({c:['variable', 'framed'], a:{variable}, ch:[
					d({t:'span', c:['label'], ch:[d({t:'span', p:{textContent:variable}})]}),
					input
				]});
				variables.append(variable_element);
			}
		}
		pre_rendered.append(render_prepared(meta.prepared_roller.prepared)??'');
	}
	function roll(output, meta) {
		output.textContent = '';
		if (!meta.prepared_roller) { return; }
		const simple_pattern = pattern.find(meta.prepared_roller.prepared);
		meta.rolled = meta.prepared_roller(
			false, false, meta.variables
		);
		output.append(simple_pattern
			? pattern.render(simple_pattern, meta.rolled)
			: render_node(meta.rolled)??''
		);
		output.append(d({t:'span', c:['roll-total'], ch: [render_result(meta.rolled.result)]}));
	}
	let $input;
	let $pre_rendered;
	let $variables;
	let $output;
	return {
		__meta,
		parse,
		roll,
		setup() {
			const section = d({c:['section'], a:{id:'complex-rolling'}, ch:[
				d({c:['title'], p:{textContent:"🎲Dés complexes"}}),
				d({c:['input'], ch:[
					$input = d({t:'input',
						c:['framed', '-darkest'],
						a:{type:'text', name:'', style:"width: 100%;"},
						e:{input: () => parse($input, $pre_rendered, $variables, __meta)}
					}),
					$pre_rendered = d({c:['pre-rendered', 'framed', '-darkest']})
				]}),
				$variables = d({c:['variables']}),
				d({t:'button', p:{textContent:"Lancer !"}, e:{click:() => roll($output, __meta)}}),
				$output = d({c:['outcome', 'roll-display', 'framed']}),
				d({c:['help'], ch:[
					d({c:['title'], p:{textContent:'Aide'}}),
					d({c:['sub-section'], ch:[
						d({c:['label'], p:{textContent:'Opérateurs'}, e:{click:function() { this.classList.toggle('open'); }}}),
						...ROLL.operators.map(({key, priority, usage, help, is_token}) => d({
							c:['operator-doc'],
							a:{subtype:operator_subtype(key, {is_token})},
							ch:[
								d({c:['key'], p:{textContent:key}}),
								d({c:['priority'], p:{textContent:priority}}),
								d({c:['usage'], p:{textContent:usage}}),
								d({c:['help'], p:{textContent:help}}),
							]
						}))
					]}),
					d({c:['sub-section'], ch:[
						d({c:['label'], p:{textContent:'Sélecteurs'}, e:{click:function() { this.classList.toggle('open'); }}}),
						...ROLL.selectors.map(({key, priority, usage, help}) => d({
							c:['selector-doc'],
							ch:[
								d({c:['key'], p:{textContent:key}}),
								d({c:['priority'], p:{textContent:priority}}),
								d({c:['usage'], p:{textContent:usage}}),
								d({c:['help'], p:{textContent:help}}),
							]
						}))
					]})
				]})
			]});
			return section;
		}
	};
})(DOM, ROLLING);