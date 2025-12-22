const COMPLEX_ROLLER = (({d}, ROLLING) => {
	function operator_subtype(key) {
		return /[a-z]/.test(key[0]) ? 'letter'
			: /[-+*%]/.test(key[0]) ? 'math'
			: /[,;()]/.test(key[0]) ? 'grouping'
			: undefined;
	}
	function render_prepared(node) {
		if (!node) { return undefined;}
		const {type, key, value, left, right} = node;
		const children = [];
		if (left) {
			const left_group = render_prepared(left);
			if (left_group) {
				children.push(d({t:'span', c:['left'], ch:[left_group]}));
			}
		}
		if ((type === 'number') || (type === 'variable')) {
			children.push(d({t:'span', p:{textContent:value}, c:['value'], a:{type, value}}));
		} else {
			const subtype = (type !== 'operator') ? undefined : operator_subtype(key);
			children.push(d({t:'span', p:{textContent:key}, c:['key'], a:{type, subtype, key}}));
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
		if (left) {
			children.push(d({t:'span', c:['left'], ch:[render_node(left)]}));
		}
		const {type, key, value} = node ?? {};
		if (node) {
			if ((type === 'number') || (type === 'variable')) {
				children.push(d({t:'span', p:{textContent:value}, c:['value'], a:{type, value}}));
			} else {
				const subtype = (type !== 'operator') ? undefined : operator_subtype(key);
				children.push(d({t:'span', p:{textContent:key}, c:['key'], a:{type, subtype, key}}));
			}
		}
		if (right) {
			children.push(d({t:'span', c:['right'], ch:[render_node(right)]}));
		}
		if (sub) {
			children.push(d({t:'span', c:['sub'], ch:[render_node(sub)]}));
		}
		return d({t:'span', c:['node'], a:{type}, ch:children});
	}
	function render_result(node) {
		while (((node.type === 'list') || (node.type === 'spread')) && (node.value.length === 1)) {
			node = node.value[0];
		}
		const {type, value} = node;
		switch (type) {
			case 'roll': {
				const roll_type = ((value === 1) ? 'min' : (value === node.dice) ? 'max' : '');
				return d({ t:'span', c:['roll-die'], a:{type:roll_type},
					ch:[d({t:'span', p:{textContent: value}})]
				});
			}
			case 'number': {
				return d({ t:'span', c:['number'], a:{type},
					ch:[d({t:'span', p:{textContent: value}})]
				});
			}
			case 'list': {
				return d({ t:'span', c:['roll-dice-array'], ch:value.map(render_result) })
			}
			case 'spread': {
				return d({ t:'span', c:['roll-dice-spread'], ch:value.map(render_result) })
			}
			case 'range': {
				return d({ t:'span', c:['roll-dice-range'], ch:[
					d({ t:'span', p:{textContent: node.lower_bound}, c:['number']}),
					d({ t:'span', p:{textContent:'..'}, c:['key'], a:{type:'operator', subtype:undefined}}),
					d({ t:'span', p:{textContent: node.upper_bound}, c:['number']}),
				]});
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
					let tested_value = node[name];
					if (matching.skip) {
						const {skip} = matching;
						while (tested_value && (tested_value.type in skip)) {
							const replacement_property = skip[tested_value.type];
							tested_value = tested_value[replacement_property];
						}
					}
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
						const matcher = indexed_matchers.get(id);
						if (matcher === that) { return 0; }
						return indexed_matchers.get(id).depth();
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
			const reccur_matcher = { test(node, that) { return that.test(node, that); } };
			const none_matcher = { test(node) { return !node ? { id: '<void>' } : undefined; }, depth() { return 0; } };
			return {
				index,
				indexed: indexed_matcher,
				none() { return none_matcher; },
				either: either_matcher,
				reccur: reccur_matcher,
				test(node, matcher) {
					return indexed_matchers.get(matcher).test(node);
				},
				inspect() {
					indexed_matchers.forEach((matcher, id) => console.log(id, matcher.depth()));
				}
			};
		})();
		const meta_matcher = (({index, indexed, either, homogenous, none, reccur}) => {
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
				{ name:'right', matching: { skip, matcher: either( none(),
					indexed('number'), indexed('variable'), indexed('simple-range'), indexed('simple-values')
				)}}
			] });
			index('random-selector', { properties: [
				{ name:'type', matching: { value:'selector' } },
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
			index('simple-filter', { properties: [
				{ name:'type', matching: { value:'operator' } },
				{ name:'key', matching: { matcher:{test: (key) => 'kpc'.includes(key) } } },
				{ name:'left', matching: { skip, matcher: either(
					none(),
					indexed('number'), indexed('variable'), indexed('simple-roll'),
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
					indexed('number'), indexed('variable'), indexed('simple-roll'),
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

			return either(
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
			const children = [];
			if (left) {
				left = skipping(left, pattern.left, (outcome) => outcome.node);
				let left_group = render(pattern.left, left);
				if (left_group) {
					if ((key === ',') && (left.node.key === ',')) {
						children.push(...left_group.childNodes);
					} else {
						children.push(d({t:'span', c:['left'], ch:[left_group]}));
					}
				}
			}
			// indexed('variable'),
			// indexed('number'),
			if ((type === 'number') || (type === 'variable')) {
				children.push(d({t:'span', p:{textContent:value}, c:['value'], a:{type, value}}));
			} else {
				const subtype = (type !== 'operator') ? undefined : operator_subtype(key);
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
			return d({t:'span', c:['node', pattern.id], a:{type}, ch:children});
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

	let $input;
	let $pre_rendered;
	let $variables;
	let $output;
	function parse() {
		const expr = $input.value;
		try {
			__meta.prepared_roller = ROLL.prepare(expr);
		} catch (e) {
			__meta.prepared_roller = undefined;
		}
		// console.log(prepared);
		__meta.rolled = undefined;
		__meta.variables = new Map();
		// console.log(rolled);

		$variables.textContent = '';
		$pre_rendered.textContent = '';
		if (!__meta.prepared_roller) { return; }
		if (__meta.prepared_roller.variables) {
			for (let variable of __meta.prepared_roller.variables) {
				const base_value = __meta.default_variables.get(variable) ?? 0;
				__meta.variables.set(variable, base_value);
				const input = d({t:'input', c:['value', 'framed'], a:{type:'number', placeholder:'<valeur>'}, e:{input:(e) => {
					const value = +e.target.value;
					__meta.variables.set(variable, value);
					if (value) {
						__meta.default_variables.set(variable, value);
					} else {
						__meta.default_variables.delete(variable);
					}
				}}});
				input.value = base_value;
				const variable_element = d({c:['variable', 'framed'], a:{variable}, ch:[
					d({t:'span', c:['label'], ch:[d({t:'span', p:{textContent:variable}})]}),
					input
				]});
				$variables.append(variable_element);
			}
		}
		$pre_rendered.append(render_prepared(__meta.prepared_roller.prepared)??'');
	}
	function roll() {
		$output.textContent = '';
		if (!__meta.prepared_roller) { return; }
		const simple_pattern = pattern.find(__meta.prepared_roller.prepared);
		__meta.rolled = __meta.prepared_roller(
			false, false, __meta.variables
		);
		$output.append(simple_pattern
			? pattern.render(simple_pattern, __meta.rolled)
			: render_node(__meta.rolled)??'');
		$output.append(d({t:'span', c:['roll-total'], ch: [render_result(__meta.rolled.result)]}));
	}
	return {
		__meta: {
			default_variables: new Map(),
			prepared_roller: undefined,
			variables: undefined,
			rolled: undefined
		},
		parse,
		roll,
		setup() {
			const section = d({c:['section'], a:{id:'complex-rolling'}, ch:[
				d({c:['title'], p:{textContent:"🎲Dés complexes"}}),
				d({c:['input'], ch:[
					$input = d({t:'input',
						c:['framed', '-darkest'],
						a:{type:'text', name:'', style:"width: 100%;"},
						e:{input: () => parse()}
					}),
					$pre_rendered = d({c:['pre-rendered', 'framed', '-darkest']})
				]}),
				$variables = d({c:['variables']}),
				d({t:'button', p:{textContent:"Lancer !"}, e:{click:() => roll()}}),
				$output = d({c:['outcome', 'roll-display', 'framed']}),
				d({c:['help'], ch:[
					d({p:{textContent:'Aide'}}),
					d({c:['sub-section'], ch:[
						d({c:['label'], p:{textContent:'Opérateurs'}}),
						...ROLL.operators.map(({key, priority, usage, help}) => d({
							c:['operator-doc'],
							a:{subtype:operator_subtype(key)},
							ch:[
								d({c:['key'], p:{textContent:key}}),
								d({c:['priority'], p:{textContent:priority}}),
								d({c:['usage'], p:{textContent:usage}}),
								d({c:['help'], p:{textContent:help}}),
							]
						}))
					]}),
					d({c:['sub-section'], ch:[
						d({c:['label'], p:{textContent:'Sélecteurs'}}),
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
	}
})(DOM, ROLLING);