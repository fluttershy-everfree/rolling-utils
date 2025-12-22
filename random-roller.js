const {ROLL, PROBS, FRACS, ROUNDING} = (() => {
	function range_sum(min, max) {
		return ((max-min+1)*(min+max))/2;
	}
	function fast_expo(val, pow, composition_op) {
		if (pow == 0) { throw ('does not support nul power'); }
		if (pow == 1) { return val; }
		const odd = pow%2;
		const rest = (pow-odd) >> 1;
		const fast_result = fast_expo(val, rest, composition_op);
		const composed = composition_op(fast_result, fast_result);
		return odd ? composition_op(composed, val) : composed;
	}

	const ROUNDING = (() => {
		const MODES = {
			INF: 0,
			GR:  1,
			GV:  2,
			SUP: 3
		};
		const real_mod = function(v, m) {
			return v < 0 ? (v%m+m)%m : v%m;
		}
		const leveled = function(v, s, m, d) {
			let hi;
			if (m == MODES.INF) {
				hi = 0;
			} else if (m == MODES.SUP) {
				hi = s-1;
			} else if (m == MODES.GV) {
				hi = (   s   - (  s  %2))/2;
			} else if (m == MODES.GR) {
				hi = ( (s-1) - ((s-1)%2))/2;
			}
			let mod = hi - real_mod(v + hi, s);
			let c = v + mod;
			return d ? c/s : c;
		};
		const levelby = function(v0, l0, v1, l1, v) {
			const s = v1 - v0;
			const h = l1 - l0;

			const flat = leveled(v - v0, s, MODES.INF, true);
			return flat * h + l0;
		};
		const leveler = function(v0, l0, v1, l1) {
			const s = v1 - v0;
			const h = l1 - l0;
			return function(v) {
				const flat = leveled(v - v0, s, MODES.INF, true);
				return flat * h + l0;
			};
		};
		return { MODES, leveled, levelby, leveler };
	})();

	/* FRACTIONS */
	const FRACS = (() => {
		function gcd(a,b) {
			a = Math.abs(a);
			b = Math.abs(b);
			if (b > a) { let temp = a; a = b; b = temp; }
			while (!isNaN(a) && !isNaN(b)) {
				if (b == 0) { return a; }
				a %= b;
				if (a == 0) { return b; }
				b %= a;
			}
		}
		function to_f() {
			return this.num / this.den;
		}
		function frac(num, den) {
			if (Math.floor(num) !== num) { throw('invalid numerator "'+num+"'"); }
			if (Math.floor(den) !== den) { throw('invalid denominator "'+den+"'"); }
			const frac_gcd = gcd(num, den);
			num /= frac_gcd;
			den /= frac_gcd;
			return ({num, den, to_f});
		}
		function add_fracs(a, b) {
			const den_gcd = gcd(a.den, b.den);
			const a_mul = b.den/den_gcd;
			const b_mul = a.den/den_gcd;
			return frac(
				(a.num * a_mul) + (b.num * b_mul),
				(a_mul * b_mul * den_gcd)
			);
		}
		function mul_fracs(a, b) {
			return frac(a.num*b.num, a.den*b.den);
		}
		return {
			NULL: frac(0,1),
			ONE: frac(1,1),
			new: frac,
			add: add_fracs,
			mul: mul_fracs
		};
	})();

	/* PROBABILITIES */
	const PROBS = (() => {
		const UNRELIABLE = new Map();
		function single(value, probabilities) {
			probabilities ??= new Map();
			probabilities.set(value, FRACS.ONE);
			return probabilities;
		}
		const ZERO = single(0);
		function linear(pmins, pmaxs, probabilities) {
			if ((pmins === UNRELIABLE) || (pmaxs === UNRELIABLE)) { return UNRELIABLE; }
			probabilities ??= new Map();
			for (let min_value of pmins.keys()) {
				for (let max_value of pmaxs.keys()) {
					if (max_value < min_value) { continue; }
					const min_p = pmins.get(min_value);
					const max_p = pmaxs.get(max_value);

					const scenario_probability = FRACS.mul(min_p, max_p);
					const value_probability = FRACS.mul(scenario_probability, FRACS.new(1, max_value-min_value+1));
					for (let value = min_value ; value <= max_value ; ++value) {
						let cp = probabilities.get(value) ?? FRACS.NULL;
						probabilities.set(value, FRACS.add(cp, value_probability))
					}
				}
			}
			return probabilities;
		}
		function larp(value, proba, weight, existing) {
			const value_probability = FRACS.mul(proba, weight);
			const existing_probability = existing.get(value) ?? FRACS.NULL;
			existing.set(value, FRACS.add(existing_probability, value_probability));
		}
		function combine(l, r, operator, probabilities) {
			if ((l === UNRELIABLE) || (r === UNRELIABLE)) { return UNRELIABLE; }
			l ??= single(0);
			operator ??= ADDITION;
			const combined = probabilities ?? new Map();
			for (let l_value of l.keys()) {
				if (typeof l_value === 'string') { throw 'problem'; }
				for (let r_value of r.keys()) {
					if (typeof r_value === 'string') { throw 'problem'; }
					const l_p = l.get(l_value);
					const r_p = r.get(r_value);

					const value = operator(l_value, r_value);
					larp(value, l_p, r_p, combined);
				}
			}
			return combined;
		}
		function average(weighed_probabilities, basis) {
			for (let {probabilities} of weighed_probabilities) {
				if (probabilities === UNRELIABLE) { return UNRELIABLE; }
			}
			const averaged = basis ?? new Map();
			for (let {weight, probabilities} of weighed_probabilities) {
				for (let value of probabilities.keys()) {
					larp(value, probabilities.get(value), weight, averaged);
				}
			}
			return averaged;
		}
		function compute(input) {
			if (!!input.combined_probabilities) { return input.computed_probabilities; }
			switch (input.type) {
				case 'roll':
				case 'number':
				case '	': {
					throw 'should already be computed';
				}
				case 'list':
				case 'spread': {
					if (!input.probabilities) {
						return input.value
							.map(value => (value.computed_probabilities ?? compute(value)))
							.reduce(PROBS.combine);
					} else {
						const weighed_probabilities = [];
						for (let value of input.probabilities.keys()) {
							const value_probability = input.probabilities.get(value);
							const probabilities = value.computed_probabilities ?? compute(value);
							weighed_probabilities.push({weight: value_probability, probabilities});
						}
						return average(weighed_probabilities);
					}
				}
			}
		}
		function reduce(probabilities) {
			return [...probabilities.entries()].reduce((a, [v, p]) => FRACS.add(a, FRACS.mul(FRACS.new(v, 1), p)), FRACS.NULL);
		}
		return {
			UNRELIABLE,
			single,
			linear,
			combine,
			average,
			compute,
			reduce
		};
	})();


	const VOID_RESOLVE   = ({type:'void'  , value:0 });
	const DEFAULT_VALUE  = ({type:'number', value:0, computed_probabilities: PROBS.single(0) });
	const ZERO = DEFAULT_VALUE;
	const ONE            = ({type:'number', value:1, computed_probabilities: PROBS.single(1) });
	const DEFAULT_SPREAD = ({type:'spread', value:[], computed_probabilities: PROBS.single(0)});
	const DEFAULT_LIST   = ({type:'list'  , value:[], computed_probabilities: PROBS.single(0)});
	const DEFAULT_RANGE  = ({type:'range' , value:0, lower_bound: undefined, upper_bound: undefined, computed_probabilities: PROBS.single(0)});
	const DEFAULT_PREDICATE = ({type:'predicate', value:(collection, type, context) => {
		if (type === 'count') {
			switch (collection.type) {
				case 'roll':
				case 'number': {
					return {type:'number', value: 1, computed_probabilities: PROBS.UNRELIABLE};
				}
				case 'list':
				case 'spread': {
					const value = collection.value.length;
					return {type:'number', value, computed_probabilities: PROBS.UNRELIABLE};
				}
				case 'range': {
					const value = collection.upper_bound + 1 - collection.lower_bound;
					return {type:'number', value, computed_probabilities: PROBS.UNRELIABLE};
				}
				default: {
					return {type:'number', value: 0, computed_probabilities: PROBS.UNRELIABLE};
				}
			}
		}
		if (type === 'drop') {
			return {type: 'list', value:[], computed_probabilities: PROBS.UNRELIABLE};
		}
		switch (collection.type) {
			case 'list':
			case 'spread':
			case 'range': {
				return collection;
			}
			default: {
				return as_list(collection);
			}
		}
	}});
	const NUMBER_SORT = (a, b) => ( (a === b) ? 0 : (a<b) ? -1 : 1);
	const ADDITION = (a, b) => (a+b);
	const SUBTRACTION = (a, b) => (a-b);
	const MULTIPLICATION = (a, b) => (a*b);
	const MODULUS = (a, b) => (a%b);
	function make_context(stats_mode, input_variables) {
		const do_stats = !!stats_mode;
		const precomp = new Map();
		const memoize = function(key, compute) {
			if (precomp.has(key)) { return precomp.get(key); }
			const value = compute();
			precomp.set(key, value);
			return value;
		};
		const number = function(value) {
			return memoize(`${value}`, () => ({
				type: 'number',
				value: value,
				computed_probabilities: do_stats ? PROBS.single(value) : undefined
			}));
		};
		const roll = function(size) {
			return memoize('d'+size, () => ({
				type: 'roll',
				dice: size,
				computed_probabilities: do_stats ? PROBS.linear(number(1).computed_probabilities, number(size).computed_probabilities) : undefined
			}));
		};
		const range = function(lower, upper) {
			if (lower > upper) { return DEFAULT_RANGE; }
			return memoize(lower+'..'+upper, () => ({
				type: 'range',
				value: ((upper-lower+1)*(lower+upper))/2,
				lower_bound: lower,
				upper_bound: upper
			}));
		}
		const variables = new Map();
		input_variables?.forEach((value, name) => ((typeof value === 'number')&&variables.set(name, number(value))));
		return {
			stats_mode: do_stats,
			variables,
			memoize,
			number,
			roll,
			range
		};
	}



	function as_value(input, context) {
		const {type, value} = input;
		switch (type) {
			case 'roll':
			case 'number': {
				return input;
			}
			case 'list':
			case 'spread': {
				if (value.length === 1) {
					return as_value(value[0]);
				}
				const sum = value.reduce((sum, value) => (sum+as_value(value).value), 0);
				const computed_probabilities = context.stats_mode ? PROBS.compute(input) : undefined;
				return ({type:'number', value:sum, computed_probabilities});
			}
			case 'range': {
				return ({type:'number', value});
			}
			default: {
				return DEFAULT_VALUE;
			}
		}
	}
	function as_single(input, context) {
		const {type, value, probabilities, lower_bound, upper_bound} = input;
		switch (type) {
			case 'roll': {
				return input;
			}
			case 'number':
			case 'list':
			case 'range': {
				return input;
			}
			case 'spread': {
				return ({type:'list', value, probabilities});
			}
			default: {
				return DEFAULT_VALUE;
			}
		}
	}
	function as_values(input, context) {
		const {type, value, probabilities, lower_bound, upper_bound} = input;
		switch (type) {
			case 'roll':
			case 'number':
			case 'list': {
				return ({type: 'spread', value:[input]})
			}
			case 'spread': {
				return input;
			}
			case 'range': {
				const {value:lbvalue} = lower_bound;
				const {value:ubvalue} = upper_bound;
				const values = Array.from({length: ubvalue-lbvalue+1},
					(_, index) => {
						const value = lbvalue+index;
						const probabilities = context.stats_mode ? PROBS.single(value) : undefined;
						return ({type:'number', value, probabilities});
					}
				);
				return ({type:'spread', value:values});
			}
			default: {
				return DEFAULT_SPREAD;
			}
		}
	}
	function as_list(input, context) {
		const {type, value, probabilities, computed_probabilities} = input;
		switch (type) {
			case 'roll':
			case 'number': {
				const made_up_list = {type: 'list', value:[input], computed_probabilities};
				made_up_list.probabilities = PROBS.single(made_up_list);
				return made_up_list;
			}
			case 'list': {
				return input;
			}
			case 'spread': {
				return ({type:'list', value, probabilities, computed_probabilities});
			}
			case 'range': {
				const {lower_bound, upper_bound} = input;
				const /*{value:*/lbvalue/*}*/ = lower_bound;
				const /*{value:*/ubvalue/*}*/ = upper_bound;
				const values = Array.from({length: ubvalue-lbvalue+1},
					(_, index) => {
						const value = lbvalue+index;
						const probabilities = context.stats_mode ? PROBS.single(value) : undefined;
						return ({type:'number', value, probabilities});
					}
				);
				return ({type:'list', value:values});
			}
			default: {
				return DEFAULT_LIST;
			}
		}
	}
	function as_predicate(input, context) {
		const {type, value, probabilities} = input;
		switch (type) {
			case 'roll':
			case 'number': {
				const compare_value = value;
				return ({type:'predicate', value:(collection, drop, context) => FILTERS.random(collection, drop, input, context)});
			}
			case 'list':
			case 'spread': {
				const compare_value = value;
				return ({ type:'predicate', value:(collection, drop, context) => FILTERS.exact(collection, false, drop, input, context) });
			}
			case 'range': {
				const compare_value = value;
				return ({ type:'predicate', value:(collection, drop, context) => FILTERS.exact(collection, false, drop, input, context) });
			}
			case 'predicate': {
				return input;
			}
			default: {
				return DEFAULT_PREDICATE;
			}
		}
	}
	function combine_values(left, right, add, context) {
		const lrange = (left?.type === 'range');
		const rrange = (right?.type === 'range');
		const rleft  = lrange ? left  : as_value(left , context);
		const rright = rrange ? right : as_value(right, context);
		if (lrange == rrange) {
			const left_value = lrange ? range_sum(left.lower_bound, left.right_value) : rleft.value;
			const right_value = lrange ? range_sum(right.lower_bound, right.right_value) : rright.value
			const value = add ? left_value + right_value : left_value - right_Value;
			return ({ type:'number', value });
		}
		const lower_bound = (lrange ? rleft.lower_bound : add ? rright.lower_bound : -rright.upper_bound);
		const upper_bound = (lrange ? rleft.upper_bound : add ? rright.upper_bound : -rright.lower_bound);
		const offset = (lrange ? (add ? rright.value : -rright.value) : rleft.value);
		return context.range(lower_bound + offset, upper_bound + offset);
	}
	function make_range(lower_bound, upper_bound, context) {
		const range = Object.assign({}, context.range(lower_bound.value, upper_bound.value));
		if (context.stats_mode) {
			const probabilities = new Map();
			const weighed_probabilities = [];
			for (let lower_value of lower_bound.computed_probabilities.keys()) {
				for (let upper_value of upper_bound.computed_probabilities.keys()) {
					if (lower_value > upper_value) { }
					const value_probability = FRACS.mul(
						lower_bound.computed_probabilities.get(lower_value),
						upper_bound.computed_probabilities.get(upper_value)
					);
					const range = context.range(lower_value, upper_value);
					probabilities.set(range, value_probability);
					weighed_probabilities.push({weight:value_probability, probabilities:PROBS.single(range.value)});
				}
			}
			Object.assign(range, {probabilities, computed_probabilities:PROBS.average(weighed_probabilities)});
		}
		return range;
	}
	const operators = new Map()
		.set('{block-linker}', { priority:90, apply:(_) => _ })
		/* roll */
		.set('d'  , { priority:5, apply:(count, size, context) => {
			const {value:cvalue, computed_probabilities:pcount} = as_value(count, context);
			const {value:svalue, computed_probabilities:psize} = as_value(size , context);

			const base_roll = context.roll(svalue);
			const values = (cvalue < 1) ? [] : (new Array(Math.max(cvalue, 0)))
				.fill(undefined)
				.map(_ => Object.assign({}, base_roll, {value:1+Math.floor(Math.random() * Math.max(svalue, 1))}));

			const roll = { type:'list' , value:values};
			if (context.stats_mode) {
				const probabilities = new Map();
				const weighed_probabilities = [];
				for (let size_value of psize.keys()) {
					const lone_roll_type = context.roll(size_value);
					for (let count_value of pcount.keys()) {
						const roll_type = context.memoize(count_value+'⋅d'+size_value, () => (/*(count_value === 1)
							? lone_roll_type
							: */{
								type: 'list',
								value: (new Array(Math.max(cvalue, 0))).fill(lone_roll_type),
								computed_probabilities: fast_expo(lone_roll_type.computed_probabilities, count_value, PROBS.combine)
							}
						));
						const value_probability = FRACS.mul(psize.get(size_value), pcount.get(count_value));
						probabilities.set(roll_type, value_probability);
						weighed_probabilities.push({weight: value_probability, probabilities:roll_type.computed_probabilities})
					}
				}
				Object.assign(roll, {probabilities, computed_probabilities:PROBS.average(weighed_probabilities)});
			}
			return roll;
		}, usage: '<count:number>d<size:number> -> list<roll>', help: 'Throws <count> <size>-sided dice, giving a list of <count> values ranging from 1 to <size>. Any other type is converted to <number> prior the the computation.',
			default_left: ONE, is_random: true
		})
		/* Keep */
		.set('k'  , { priority:5, apply:(collection, filter, context) => as_predicate(filter, context).value(collection, 'keep', context),
			usage: '<collection:list>k<selector> -> list<number|roll>', help: 'Keeps elements of <collection> (converted to list) that match <selector>'
		})
		/* Drop */
		.set('p'  , { priority:5, apply:(collection, filter, context) => as_predicate(filter, context).value(collection,  'drop', context),
			usage: '<collection:list>p<selector> -> list<number|roll>', help: 'Drops (pop) elements of <collection> (converted to list) that match <selector>'
		})
		/* Count */
		.set('c'  , { priority:5, apply:(collection, filter, context) => as_predicate(filter, context).value(collection, 'count', context),
			usage: '<collection:list>c<selector> -> number', help: 'Counts elements of <collection> (converted to list) that match <selector>'
		})
		/* add */
		.set('+'  , { priority:2, apply:(left, right, context) => combine_values(left, right,  true, context),
			usage: '<number|range>+<number|range> -> number|range', help: 'Combines values by addition. Two <number> give the sum (<number>), a <number> and a <range> give a shifted <range>, two <range> give a resized <range>',
			default_left: ZERO,
			default_right: ZERO
		})
		/* subtract */
		.set('-'  , { priority:2, apply:(left, right, context) => combine_values(left, right, false, context),
			usage: '<number|range>-<number|range> -> number|range', help: 'Combines values by subtraction. Two <number> give the difference (<number>), a <number> and a <range> give a shifted <range>, two <range> give a resized <range>. Any other type is converted to <number> prior the the computation.',
			default_left: ZERO,
			default_right: ZERO
		})
		/* times */
		.set('*'  , { priority:3, apply:(left, right, context) => { /* TODO probs */
			const {value:lvalue, computed_probabilities:lprobs} = as_value(left , context);
			const {value:rvalue, computed_probabilities:rprobs} = as_value(right, context);
			const computed_probabilities = PROBS.combine(lvalue, rvalue, MULTIPLICATION);
			return ({ type:'number', value:lvalue*rvalue, computed_probabilities });
		}, usage: '<number>*<number> -> number', help: 'Combines values by multiplication. Two <number> give the product (<number>). Any other type is converted to <number> prior the the computation.',
			default_left: ONE,
			default_right: ONE
		})
		/* mod */
		.set('%'  , { priority:4, apply:(left, right, context) => {
			const {value:lvalue, computed_probabilities:lprobs} = as_value(left , context);
			const {value:rvalue, computed_probabilities:rprobs} = as_value(right, context);
			let computed_probabilities;
			if (context.stats_mode) {
				computed_probabilities= new Map();//PROBS.combine(lvalue, rvalue, MULTIPLICATION);
				const weighed_probabilities = rprobs.map((weight, rvalue) => {
					const probabilities = new Map();
					lprobs.forEach((lweight, lvalue) => {
						const modded = lvalue%rvalue;
						probabilities.set(modded, FRACS.add(lweight, probabilities.get(modded) ?? FRACS.NULL));
					});
					return {weight, probabilities};
				});
				computed_probabilities = PROBS.average(weighed_probabilities);
			} else {
				computed_probabilities = PROBS.UNRELIABLE;
			}
			return ({ type:'number', value:lvalue%rvalue, computed_probabilities });
		}, usage: '<number>%<number> -> number', help: 'Combines values by modulo. Two <number> give the rest (<number>). Any other type is converted to <number> prior the the computation.',
			default_left: ZERO,
			default_right: ZERO
		})
		/* append */
		.set(','  , { priority:0, apply:(list, value, context) => {
			const {value:lvalue} = as_values(list);
			const {value:vvalue} = as_values(value);
			return ({ type: 'spread'  , value:[...lvalue, ...vvalue] });
		}, usage: '<body:spread>,<tail:any> -> spread<any>', help: 'Combines values into a <spread>. If <tail> is a <spread>, its values are considered separately, if it is any other type, is considered a single value. If <body> is not a <list>, it is converted into one prior the the computation.'
		})
		/* range */
		.set('..' , { priority:7, apply:(lower_bound , upper_bound, context) => make_range(as_value(lower_bound), as_value(upper_bound), context),
			usage: '<lower_bound:number>..<upper_bound:number> -> range', help: 'Makes a <range> going from <lower_bound> through <upper_bound>, inclusive. <upper_bound> is corrected to be greater or equal to <lower_bound> in all computations. Any other type is converted to <number> prior the the computation.'
		})
		/* spread */
		.set('...', { priority:1, apply:(_, list, context) => {
			const {value:lvalue, min:lmin, max:lmax} = as_list(list, context);
			return ({ type:'spread', value:lvalue });
		}, usage: '...<collection:list> -> spread', help: 'Spreads <collection> into separate values, notably for use in conjunction with the append operator (,). If <collection> is not a <list>, it is converted into one prior the the computation.'
		})
		.set(':', { priority:1, apply:(key, value, context) => {
			const matcher = as_predicate(key);
			return ({ type:'conditional', condition:matcher, value});
		}, raw_left: false, raw_right: true,
		usage: '<key:matcher>:<expr> -> conditional', help: ''});

	const FILTERS = (() => {
		function as_length(value) {
			switch (value.type) {
				case 'roll':
				case 'number': {
					return 1;
				}
				case 'list':
				case 'spread': {
					return value.value.length;
				}
				case 'range': {
					const {lower_bound, upper_bound} = value;
					return upper_bound + 1 - lower_bound;
				}
				default:
					return 1;
			}
		}
		const sort_by_value_asc = ({value:avalue}, {value:bvalue}) => {
			if (avalue < bvalue) { return -1; }
			if (avalue > bvalue) { return  1; }
			return 0;
		};
		const sort_by_value_desc = ({value:avalue}, {value:bvalue}) => {
			if (avalue > bvalue) { return -1; }
			if (avalue < bvalue) { return  1; }
			return 0;
		};
		/*
			collection: the collection to filter
			high: true:select highest, false:select lowest
			drop: true:return everything but selection, false: return only selection
			rest: count parameter
		*/
		const high_low = (collection, high, type, {value:cvalue}, context) => { /* TODo probs, will be processing intensive */
			const length = as_length(collection);
			cvalue = Math.max(cvalue, 0);
			if (type === 'count') { return ({ type:'number', value: Math.min(length, cvalue) }); }
			if (length === 0) { return DEFAULT_LIST; }

			const drop = (type === 'drop');
			if (cvalue === 0) { return drop ? collection : DEFAULT_LIST; }
			if (cvalue >= length) { return drop ? DEFAULT_LIST : collection; }

			const value_sort = high ? sort_by_value_desc : sort_by_value_asc;
			const {value:lvalue} = as_list(collection, context);

			const mapped = new Map();
			lvalue.forEach(value => mapped.set(value, as_value(value)));
			const selected_values = lvalue
				.toSorted((a, b) => value_sort(mapped.get(a), mapped.get(b)))
				.filter((_, index) => ((index < cvalue) ^ drop));
			const values = lvalue.filter(value => selected_values.includes(value));

			return ({ type:'list', value:values, computed_probabilities: PROBS.UNRELIABLE });
		};
		/*
			collection: the collection to filter
			exclude: true:select everything but target, false:select only target
			drop: true:return everything but selection, false: return only selection
			rest: target parameter
		*/
		const exact = (collection, exclude, type, pool, context) => { /* TODO probs, will be processing intensive */
			const drop = (type === 'drop') ^ exclude;
			if ((collection.type === 'range') && (pool.type === 'range')) {
				if ((collection.upper_bound < pool.lower_bound) || (pool.upper_bound < collection.lower_bound)) {
					if (type === 'count') { return drop ? collection.upper_bound + 1 - collection.lower_bound : 0; }
					else { return drop ? collection : DEFAULT_LIST; }
				}
				const lower_bound = Math.max(collection.lower_bound, pool.lower_bound);
				const upper_bound = Math.min(collection.upper_bound, pool.upper_bound);
				if (type === 'count') {
					const range = upper_bound + 1 - lower_bound;
					return drop ? collection.upper_bound + 1 - collection.lower_bound - range : range;
				}
				if (drop) {
					const lower_part = array(collection.lower_bound, lower_bound-1);
					const upper_part = array(upper_bound+1, collection.upper_bound);
					return ({ type:'list', value:[...lower_part, ...upper_part] });
				}
				return ({ type:'range', lower_bound, upper_bound });
			}
			const {value:lvalue} = as_list(collection, context);
			const mapped_target = pool.value.map((value) => as_value(value, context).value);

			const values = lvalue.filter((lvalue) => (
				drop ^ mapped_target.includes(as_value(lvalue, context).value)
			));
			if (type === 'count') {
				return ({ type:'number', value:values.length });
			}
			return ({ type:'list', value:values });
		};
		function array(min, max) {
			return (max < min) ? [] : Array.from({length:(max+1-min)}, (_,i) => (min+i));
		}
		function kpc(type, k, p, c) {
			if (type === 'keep') { return k; }
			if (type === 'drop') { return p; }
			return c;
		}
		function strict(collection, over, type, {value:tvalue}, context) {
			if (collection.type === 'range') {
				const {lower_bound, upper_bound} = collection;
				// Nothing
				const nothing = (over ? (tvalue >= upper_bound) : (tvalue <= lower_bound));
				if (nothing) { return kcp(type, DEFAULT_LIST, collection, 0); }
				// Everything
				const everything = (over ? (tvalue < lower_bound) : (tvalue > upper_bound));
				if (everything) { return kcp(type, DEFAULT_LIST, collection, upper_bound + 1 - lower_bound); }
				// Partial
				if (over) {
					switch (type) {
						case 'keep': return ({ type:'range', lower_bound:tvalue+1, upper_bound });
						case 'drop': return ({ type:'range', lower_bound, upper_bound:tvalue });
						case 'count': return upper_bound - tvalue;
					}
				} else {
					switch (type) {
						case 'keep': return ({ type:'range', lower_bound, upper_bound: tvalue-1 });
						case 'drop': return ({ type:'range', lower_bound:tvalue, upper_bound });
						case 'count': return tvalue - lower_bound;
					}
				}
			}
			const drop = (type === 'drop');
			const {value:lvalue} = as_list(collection, context);
			const comparator = over ? (v) => (v > tvalue) : (v < tvalue);

			const values = lvalue.filter((lvalue) => (
				drop ^ comparator(as_value(lvalue, context).value)
			));
			if (type === 'count') {
				return ({ type:'number', value:values.length });
			}

			return ({type:'list', value:values });
		}
		function random_indexes(amount, size) {
			const redirects = new Map();
			return Array.from({length: amount}, (_,index) => {
				const revindex = size-index-1;
				const pick = Math.floor(Math.random()*(size-index));
				const redirect = redirects.get(pick) ?? pick;
				if (pick !== revindex) {
					redirects.set(pick, redirects.get(revindex) ?? revindex);
				}
				redirects.delete(revindex);
				return redirect;
			});
		}
		const random = (collection, type, {value:cvalue}, context) => {
			const length = as_length(collection);
			cvalue = Math.max(cvalue, 0);
			if (type === 'count') { return ({ type:'number', value: Math.min(length, cvalue) }); }
			if (length === 0) { return DEFAULT_LIST; }

			const drop = (type === 'drop');
			if (cvalue === 0) { return drop ? collection : DEFAULT_LIST; }
			if (cvalue >= length) { return drop ? DEFAULT_LIST : collection; }
			let indexes = random_indexes(cvalue, length);
			let sorted = [...indexes];
			sorted.sort(NUMBER_SORT);
			const values = sorted
				.map((collection.type === 'range')
					? (index) => ({ type:'number', value:index+collection.lower_bound })
					: (index) => collection.value[index]
				);
			return ({ type:'list', value:values });
		};
		const frequency = (collection, type, pool, context) => {
			if (['range', 'number', 'roll', 'variable'].includes(pool.type)) {
				return exact(collection, false, type, pool, context);
			}
			const drop = (type === 'drop');
			const consumed_indexes = new Set();
			const mapped_target = pool.value.map((value) => as_value(value, context).value);
			const values = collection.value.filter(element => {
				const {value} = as_value(element, context);
				return drop ^ !!mapped_target.find((mvalue, i) => (
					(!consumed_indexes.has(i)) && (mvalue === value) && (consumed_indexes.add(i), true)
				));
			});
			if (type === 'count') {
				return ({ type:'number', value:values.length });
			}
			return ({ type:'list', value:values });
		};
		return {
			high_low,
			exact,
			strict,
			random,
			frequency
		}; 
	})();
	const selectors = new Map()
		/* Min-max fundamendtaly flawed : discreet reachable values are not stored. Espacially true for = and ! */
		/* Additionnaly : filter work on pre-computed collections, not theorectical models so their min-max predictions are not stable. */
		/* An isolated filter may be accurate, multiple ones will result in discrepancies */
		.set('h', { priority:6, apply:(_, count, context) => {
			const c = as_value(count, context);
			return ({ type:'predicate', value:(collection, type, context) => FILTERS.high_low(collection, true, type, c, context) });
		}, usage: 'h<count:number>', help: 'Used in conjunction with keep (k), drop (p) or count (c). Matches the <count> highest values.'
		})
		.set('l', { priority:6, apply:(_, count, context) => {
			const c = as_value(count, context);
			return ({ type:'predicate', value:(collection, type, context) => FILTERS.high_low(collection, false, type, c, context) });
		}, usage: 'l<count:number>', help: 'Used in conjunction with keep (k), drop (p) or count (c). Matches the <count> lowest values.'
		})
		.set('#', { priority:6, apply:(_, count, context) => {
			const c = as_value(count, context);
			return ({ type:'predicate', value:(collection, type, context) => FILTERS.random(collection, type, c, context) });
		}, usage: '#<amount:number>', help: 'Used in conjunction with keep (k), drop (p) or count (c). Matches <amount> random values.', is_random: true
		})
		.set('<', { priority:6, apply:(_, threshold, context) => {
			const t = as_value(threshold, context);
			return ({ type:'predicate', value:(collection, type, context) => FILTERS.strict(collection, false, type, t, context) });
		}, usage: '<<threshold:number>', help: 'Used in conjunction with keep (k), drop (p) or count (c). Matches values strictly below <threshold>.'
		})
		.set('>', { priority:6, apply:(_, threshold, context) => {
			const t = as_value(threshold, context);
			return ({ type:'predicate', value:(collection, type, context) => FILTERS.strict(collection, true, type, t, context) });
		}, usage: '><threshold:number>', help: 'Used in conjunction with keep (k), drop (p) or count (c). Matches values strictly above <threshold>.'
		})
		.set('=', { priority:6, apply:(_, pool, context) => {
			const tvalue = pool;//as_list(pool, context); /* List of values are tolerated */
			return ({ type:'predicate', value:(collection, type, context) => FILTERS.exact(collection, false, type, tvalue, context) });
		}, usage: '=<pool:list|range|number>', help: 'Used in conjunction with keep (k), drop (p) or count (c). Matches values equal to any value contained in the <pool>.'
		})
		.set('!', { priority:6, apply:(_, pool, context) => {
			const tvalue = pool;//as_list(pool, context); /* List of values are tolerated */
			return ({ type:'predicate', value:(collection, type, context) => FILTERS.exact(collection, true , type, tvalue, context) });
		}, usage: '!<pool:list|range|number>', help: 'Used in conjunction with keep (k), drop (p) or count (c). Matches values different from every value contained in <pool>.'
		})
		.set('f', { priority:6, apply:(_, pool, context) => {
			const tvalue = pool;
			return ({ type:'predicate', value:(collection, type, context) => FILTERS.frequency(collection, type, tvalue, context) });
		}, usage: 'f<pool:list|range|number>', help: 'Used in conjunction with keep (k), drop (p) or count (c). Matches the values of <pool>, one time each. If the collection contains a value twice but the pool has it once, only the first value will match.'
		});
	const functions = new Map()
		.set('switch', { priority:99,
			has_block: true,
			apply:(args, cases, context) => {
				const param = as_values(args).value[0] ?? 0;
				for (let {left, right} of cases) {
					const p = as_predicate(left, context);
				}
				return ZERO;
			},
			block_preprocess:(block) => {
				const list_operator = operators.get(',');
				const case_operator = operators.get(':');
				const cases = [];
				let node = block.value;
				while (node.value === list_operator) {
					if (node.right.value !== case_operator) { throw { t:"switch statement can only have cases in its attached block", c:node.right }; }
					cases.push(node.right);
					node = node.left;
				}
				if (node.value !== case_operator) { throw { t:"switch statement can only have cases in its attached block", c:node }; }
				cases.push(node);
				cases.reverse();
				return {key: '{cases}', value: cases};
			},
			default_left: DEFAULT_SPREAD, raw_left: false, raw_right: true,
			usage: 'switch(<expr>) {<case>[, <case>[, ...]}', help: ''
		});
	function reorder_group(group) {
		let root = group.root;
		let node = root;
		while (node?.value?.priority !== undefined) {
			const priority = node.left?.value?.priority;
			const base_node = node;
			if ((priority < node.value.priority) || ((node.left?.key !== undefined) && (node.left.right === undefined))) {
				const swapped_child = node.left.right;
				const next_node = node.parent ?? node.left;
				/* Attach LEFT to parent, replacing NODE */
				if (node.parent === undefined) { // ROOT
					root = node.left
				} else {
					node.parent.left = node.left;
				}
				node.left.parent = node.parent;
				/* Attach NODE to LEFT, replacing SWAPPED*/
				node.left.right = node;
				node.parent = node.left;
				/* Attach SWAPPED to NODE, replacing LEFT*/
				node.left = swapped_child;
				if (swapped_child !== undefined) { // UNARY
					swapped_child.parent = node;
				}
				node = next_node;
			} else {
				node = node.left;
			}
		}
		group.root = root;
	}
	function tokenized() {

	}
	function parse_compile(expr) {
		const extract_up_to = function(str, i, pos) {
			i = Math.min(str.length - pos, i);
			const result = [];
			while (i > 0) {
				result.push(str.substring(pos, pos+i));
				i--;
			}
			return result;
		}
		const braces = new Map()
			.set('(', '{group}'  ).set(')', '{group}'  )
			.set('[', '{matcher}').set(']', '{matcher}')
			.set('{', '{block}'  ).set('}', '{block}'  );
		const tokens = expr.replaceAll(/[^-+*dkp=!<>hl#(,.)\[\]{}\da-zA-Z:]+/g, ' ')//.split(/(?<=([-+*dkp=!<>hl#(,)\[\]]))(?!\1)|(?<=\d)(?!\d)|(?<=\.)(?!\.)/);
			.split(/(?<![a-zA-Z\d])(?=[a-zA-Z\d])|(?<=\d)(?!\d)|(?<=[a-z])(?![a-z])|(?<=[A-Z])(?![A-Z])/)
			.map(part => {
				if (part.match(/^\d+$/)) { return part; }
				if (part.match(/^[A-Z]+$/)) { return part; }
				if (functions.has(part)) { return part; }
				let position = 0;
				const tokens = [];
				while (position < part.length) {
					let found = undefined;
					for (const sub of extract_up_to(part, 3, position)) {
						if (operators.has(sub) || selectors.has(sub) || braces.has(sub)) {
							found = sub;
							break;
						} 
					}
					if (!!found) {
						tokens.push(found);
						position += found.length;
					} else {
						position++;
					}
				}
				return tokens;
			})
			.flat();
		/*
			mapping : switch(<expr>) {<case>[, <case>[, ...]]}
			case : <number>|[<low>..<high>]: <expression>
			<matcher>:<expr> = match-up operator, low priority
			<func>(param[, param[, ...]) -> params are left-args anyway, so blocks can be passed as right-args
			func has max priority
			func next arg is a group, else fail
			func may need a block
		*/

		const groups_stack = [];
		let current_group = { root:undefined, kind: '$' };
		const block_linker_nodes = [];
		const function_nodes = [];
		const variables = new Set();
		let has_randomness = false;
		const bind_operator = function(operator) {
			has_randomness ||= !!operator.value.is_random;
			const old_root = current_group.root;
			operator.left = old_root;
			current_group.root = operator;
			if (old_root !== undefined) {
				old_root.parent = current_group.root;
			}
		}
		const push_node = function(node) {
			node.parent = current_group.root;
			if (current_group.root === undefined) {
				current_group.root = node;
			} else if (current_group.root.right === undefined) {
				current_group.root.right = node;
			}
		}
		for (let token of tokens) {
			if ((token === '(') || (token === '[') || (token === '{')) {
				groups_stack.push(current_group);
				current_group = { root:undefined, kind: braces.get(token) };
			}
			else if ((token === ')') || (token === ']') || (token === '}')) {
				if (current_group.kind !== braces.get(token)) { throw ("mismatching braces"); }
				reorder_group(current_group);
				let old_group = current_group;
				current_group = groups_stack.pop();

				if (old_group.kind === '{block}') {
					const block_linker = { parent:undefined, type:'operator', value:operators.get('{block-linker}'), left:undefined, right:undefined};
					bind_operator(block_linker);
					block_linker_nodes.push(block_linker);
				}
				push_node({ parent:undefined, type:'group', kind:old_group.kind, value:old_group.root });

			}
			else if (operators.has(token)) {
				bind_operator({ parent:undefined, type:'operator', key:token, value:operators.get(token), left:undefined, right:undefined });
			} else if (selectors.has(token)) {
				bind_operator({ parent:undefined, type:'selector', key:token, value:selectors.get(token), left:undefined, right:undefined });
			} else if (functions.has(token)) {
				const func = { parent:undefined, type:'function', key:token, value:functions.get(token), left:undefined, right:undefined };
				bind_operator(func);
				function_nodes.push(func);
			} else if (token?.match(/^[A-Z]+$/)) {
				push_node({ parent:current_group.root, type:'variable', value:token });
				variables.add(token);
			} else {
				const number = +token;
				if (!isNaN(number)) {
					push_node({ parent:current_group.root, type:'number', value:number, computed_probabilities:PROBS.single(number) });
				}
			}
		}
		while (groups_stack.length) {
			reorder_group(current_group);
			let old_group = current_group;
			current_group = groups_stack.pop();
			current_group.root.right = ({ parent:current_group.root, type: 'group', value: old_group.root });
		}
		reorder_group(current_group);
		for (const function_node of function_nodes) {
			if (!!function_node.left) {
				console.log('function should not have a left operand : ', function_node, function_node.left);
				function_node.left = undefined;
			}
			if (!function_node.right) {
				console.log('function should have a right operand : ', function_node);
			}
			function_node.left = function_node.right;
			function_node.right = undefined;
		}
		for (const block_linker of block_linker_nodes) {
			const function_node = block_linker.left;
			const block = block_linker.right;
			block_linker.right = undefined;
			if (!function_node) {
				console.log('getting rid of unattached block : ', block);
				continue;
			}
			if (!function_node.value.has_block) {
				console.log('getting rid of unused block : ', block);
				continue;
			}
			function_node.right = function_node.value?.block_preprocess?.(block) ?? block;
		}
		if (current_group.root) {
			current_group.root.variables = variables;
			current_group.root.has_randomness = has_randomness;
		}
		return current_group.root;
	}
	function resolve(node, default_value, context) {
		if (node === undefined) { return {result :default_value??VOID_RESOLVE}; }
		if (node.type === 'number') { return {node, result: node}; }
		if (node.type === 'variable') {
			return { node, result: context.variables.get(node.value) ?? default_value };
		}
		if (node.type === 'group' ) {
			const sub = resolve(node.value, default_value, context);
			return { node, sub, result: /*as_single(*/sub.result/*, context)*/ };
		}
		const left  = node.value.raw_left  ? node.left  : resolve(node.left , node.value.default_left , context);
		const right = node.value.raw_right ? node.right : resolve(node.right, node.value.default_right, context);
		const r = node.value.apply(left.result, right.result, context);
		return {node, left, right, result: r ?? default_value};
	}
	function roll(root, stats_mode, variables) {
		const context = make_context(stats_mode, variables);
		const missing_variables = new Set();
		root.variables?.forEach((name) => (context.variables.has(name)||missing_variables.add(name)));
		if (missing_variables.size) {
			console.warn('Rolling with missing variables : ', [...missing_variables]);
		}

		const resolved = resolve(root, undefined, context); 
		return (((resolved.result?.type === 'spread') || (resolved.result?.type === 'range'))
			? resolved
			: Object.assign({}, resolved, { result: as_value(resolved.result, context) })
		);
	}
	function simplified(input) {
		const {type, value, dice} = input;
		switch(type) {
			case 'roll':
				return ({roll:value, dice:max});
			case 'number':
				return value;
			case 'list':
			case 'spread': {
				return value.map(simplified);
			}
			case 'range': {
				const {lower_bound:{value:lbvalue}, upper_bound:{value:ubvalue}} = input;
				return Array.from({length: ubvalue-lbvalue+1}, (_, index) => (lbvalue+index));
			}
			default: { return 0; }
		}
	}
	function map_as_list(map) {
		const list = [];
		map.forEach(({priority, usage, help}, key) => help&&list.push({key, priority, usage, help}));
		return list;
	}
	return {ROLL:{
		roll: (expr, stats_mode, variables) => roll(parse_compile(expr), stats_mode, variables),
		prepare: (expr) => {
			const invalid = !expr;
			invalid&&(expr = "0");
			const prepared = parse_compile(expr);
			const roller = (simplify, stats_mode, variables) => {
				if (simplify && stats_mode) { console.warn('suspicious roll asks for stats but is simplified'); }
				const result = roll(prepared, !simplify && stats_mode, variables);
				return simplify ? simplified(result.result) : result;
			};
			roller.is_raw_number = (prepared?.type === 'number');
			roller.variables = prepared?.variables;
			roller.has_randomness = prepared?.has_randomness;
			roller.prepared = prepared;
			return roller;
		},
		operators: map_as_list(operators),
		selectors: map_as_list(selectors),
	}, PROBS, FRACS, ROUNDING};
})();