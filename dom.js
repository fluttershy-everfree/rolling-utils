const DOM = (() => {
	const _ = undefined;
	function g$(id) { return document.getElementById(id); }
	function d({t, p:ps, c:cs, a:as, e:es, s:ss, ch}={}) {
		let _n = document.createElement(t??'div');
		if (ps) { Object.assign(_n, ps); }
		cs?.forEach(c => _n.classList.add(c));
		if (as) { for (let a in as) { _n.setAttribute(a, as[a]); } }
		if (es) { for (let e in es) { _n.addEventListener(e, es[e]); } }
		if (ss) { for (let s in ss) { _n.style.setProperty(s, ss[s]); } }
		ch?.forEach(c => _n.append(c));
		return _n;
	}
	function gg(t, id, rs, cid) {
		[...g$(id).children].forEach(c => c.classList.remove('active'));
		if (t === undefined) { return; }
		g$((cid??id)+'-'+rs(t).id)?.classList.add('active');
	}
	return { d, g$, gg };
})();