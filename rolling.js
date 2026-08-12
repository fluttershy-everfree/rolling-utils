const ROLLING = (() => {
	const ROLL_VERDICT = [
		{ id: 'fail', label: "Échec"      },
		{ id: 'meet', label: "Sur le fil" },
		{ id: 'pass', label: "Succès"     }
	];
	function die(size) { return Array.from({length: size}, (_,i)=>(i+1)); };
	/** Value: the number rolled. type : min|max|, dismissed :false|true|<string>reason */
	function die_roll(die, v, keep) { return {
		value: v,
		type: ((v === 1) ? 'min' : (v === die.length) ? 'max' : ''),
		dismissed: !keep
	}; }
	function dc_verdict(dc, roll) {
		const verdict = ((dc < roll) ? 'pass' : (dc <= roll) ? 'meet' : 'fail');
		return ROLL_VERDICT.find( ({id}) => (id === verdict) );
	}
	return {
		r(c) { return c[Math.floor(Math.random()*c.length)]; },
		die, die_roll, dc_verdict,
		DICE: {
			d2: die(2),
			d4: die(4),
			d6: die(6),
			d8: die(8),
			d10: die(10),
			d12: die(12),
			d20: die(20)
		},
		ROLL_VERDICT
	};
})();