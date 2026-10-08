import { select } from 'd3-selection';
import { forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY, type SimulationNodeDatum } from 'd3-force';
import { drag } from 'd3-drag';
import 'd3-transition';

type Domain = 'ea' | 'dw' | 'iam' | 'ai';
interface Cap { id: string; label: string; domain: Domain; note: string }
interface WorkItem { id: string; title: string; caps: string[] }
interface MapData { capabilities: Cap[]; links: [string, string][]; work: WorkItem[] }

interface Node extends SimulationNodeDatum {
  id: string;
  kind: 'hub' | 'cap' | 'work';
  label: string;
  domain?: Domain;
  note?: string;
  caps?: string[];
  r: number;
}
interface Link { source: string | Node; target: string | Node; kind: 'member' | 'cross' | 'proof' }

const DOMAIN_NAME: Record<Domain, string> = {
  ea: 'Enterprise architecture',
  dw: 'Digital workplace',
  iam: 'Identity & access',
  ai: 'Agentic AI',
};
const DOMAIN_COLOUR: Record<Domain, string> = { ea: '#F1EFE8', dw: '#E9A23B', iam: '#C9C2AE', ai: '#F2C230' };

export function initCapabilityMap(svgEl: SVGSVGElement, reduceMotion: boolean) {
  const data: MapData = JSON.parse(document.getElementById('map-data')!.textContent || '{}');
  const W = svgEl.clientWidth || 1200;
  const H = svgEl.clientHeight || 700;
  const compact = W < 700;
  const svg = select(svgEl).attr('viewBox', `0 0 ${W} ${H}`);

  // Hubs sit where the orbit placed them: EA centre, workplace top, identity lower right, AI lower left.
  const hubPos: Record<Domain, [number, number]> = {
    ea: [W * 0.5, H * 0.5],
    dw: [W * 0.5, H * 0.17],
    iam: [W * (compact ? 0.78 : 0.8), H * 0.76],
    ai: [W * (compact ? 0.22 : 0.2), H * 0.76],
  };

  const nodes: Node[] = [
    ...(Object.keys(DOMAIN_NAME) as Domain[]).map((d) => ({
      id: `hub-${d}`, kind: 'hub' as const, label: DOMAIN_NAME[d], domain: d,
      r: compact ? 26 : 38, fx: hubPos[d][0], fy: hubPos[d][1],
    })),
    ...data.capabilities.map((c) => ({ id: c.id, kind: 'cap' as const, label: c.label, domain: c.domain, note: c.note, r: compact ? 6 : 8 })),
    ...data.work.map((w) => ({ id: `work-${w.id}`, kind: 'work' as const, label: w.title, caps: w.caps, r: compact ? 6 : 7 })),
  ];
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const links: Link[] = [
    ...data.capabilities.map((c) => ({ source: `hub-${c.domain}`, target: c.id, kind: 'member' as const })),
    ...data.links.map(([a, b]) => ({ source: a, target: b, kind: 'cross' as const })),
    ...data.work.flatMap((w) => w.caps.map((c) => ({ source: `work-${w.id}`, target: c, kind: 'proof' as const }))),
  ];

  // Neighbour lookup for highlighting.
  const neighbours = new Map<string, Set<string>>();
  const addN = (a: string, b: string) => {
    if (!neighbours.has(a)) neighbours.set(a, new Set());
    neighbours.get(a)!.add(b);
  };
  links.forEach((l) => { addN(l.source as string, l.target as string); addN(l.target as string, l.source as string); });

  const homeX = (n: Node) => (n.domain ? hubPos[n.domain][0] : W * 0.5);
  const homeY = (n: Node) => (n.domain ? hubPos[n.domain][1] : H * 0.5);

  const sim = forceSimulation<Node>(nodes)
    .force('link', forceLink<Node, Link>(links).id((d) => d.id)
      .distance((l) => (l.kind === 'member' ? (compact ? 60 : 105) : l.kind === 'cross' ? 220 : 120))
      .strength((l) => (l.kind === 'member' ? 0.9 : l.kind === 'cross' ? 0.04 : 0.12)))
    .force('charge', forceManyBody<Node>().strength((d) => (d.kind === 'hub' ? -500 : compact ? -90 : -170)))
    .force('collide', forceCollide<Node>().radius((d) => d.r + (d.kind === 'cap' ? (compact ? 10 : 30) : 14)))
    .force('x', forceX<Node>(homeX).strength((d) => (d.kind === 'work' ? 0.01 : 0.08)))
    .force('y', forceY<Node>(homeY).strength((d) => (d.kind === 'work' ? 0.01 : 0.08)));

  // ---- Drawing ----
  const linkLayer = svg.append('g');
  const linkSel = linkLayer.selectAll('line').data(links).join('line')
    .attr('stroke', (l) => (l.kind === 'cross' ? '#F2C230' : 'rgba(241,239,232,1)'))
    .attr('stroke-opacity', (l) => (l.kind === 'cross' ? 0.45 : l.kind === 'member' ? 0.16 : 0.08))
    .attr('stroke-width', (l) => (l.kind === 'cross' ? 1.4 : 1))
    .attr('stroke-dasharray', (l) => (l.kind === 'proof' ? '3 5' : null));

  const nodeSel = svg.append('g').selectAll<SVGGElement, Node>('g').data(nodes).join('g')
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', (d) => (d.kind === 'work' ? `Case study: ${d.label}` : d.label))
    .style('cursor', 'pointer')
    .style('outline', 'none');

  nodeSel.filter((d) => d.kind === 'hub').append('circle')
    .attr('r', (d) => d.r)
    .attr('fill', '#1B1B1F')
    .attr('stroke', (d) => DOMAIN_COLOUR[d.domain!])
    .attr('stroke-width', 1.5)
    .style('filter', 'drop-shadow(0 0 18px rgba(242,194,48,0.35))');
  nodeSel.filter((d) => d.kind === 'cap').append('circle')
    .attr('r', (d) => d.r)
    .attr('fill', (d) => DOMAIN_COLOUR[d.domain!]);
  nodeSel.filter((d) => d.kind === 'work').append('rect')
    .attr('x', (d) => -d.r).attr('y', (d) => -d.r)
    .attr('width', (d) => d.r * 2).attr('height', (d) => d.r * 2)
    .attr('transform', 'rotate(45)')
    .attr('fill', '#121214').attr('stroke', '#F2C230').attr('stroke-width', 1.3);

  // Labels: hubs always; capabilities on wide screens.
  nodeSel.filter((d) => d.kind === 'hub').append('text')
    .attr('text-anchor', 'middle').attr('dy', (d) => d.r + 20)
    .attr('fill', '#F1EFE8').attr('font-size', compact ? 12 : 15).attr('font-weight', 600)
    .text((d) => d.label);
  const capLabels = nodeSel.filter((d) => d.kind === 'cap').append('text')
    .attr('dy', 4).attr('dx', 13)
    .attr('fill', '#A7A49C').attr('font-size', 12.5)
    .attr('opacity', compact ? 0 : 1)
    .text((d) => d.label);
  const focusRing = nodeSel.append('circle')
    .attr('r', (d) => d.r + 6).attr('fill', 'none').attr('stroke', '#F2C230').attr('stroke-width', 2).attr('opacity', 0);

  const render = () => {
    linkSel
      .attr('x1', (l) => (l.source as Node).x!).attr('y1', (l) => (l.source as Node).y!)
      .attr('x2', (l) => (l.target as Node).x!).attr('y2', (l) => (l.target as Node).y!);
    nodeSel.attr('transform', (d) => `translate(${d.x},${d.y})`);
    // Keep labels on the outer side of each hub so they don't cover the centre.
    capLabels
      .attr('text-anchor', (d) => (d.x! < homeX(d) - 4 ? 'end' : 'start'))
      .attr('dx', (d) => (d.x! < homeX(d) - 4 ? -13 : 13));
  };

  // Keep everything inside the frame.
  const clamp = () => nodes.forEach((n) => {
    // Leave room for capability labels at the left and right edges.
    const padX = n.kind === 'cap' && !compact ? 160 : 18;
    n.x = Math.max(padX, Math.min(W - padX, n.x!));
    n.y = Math.max(24, Math.min(H - 24, n.y!));
  });

  if (reduceMotion) {
    sim.stop();
    for (let i = 0; i < 400; i++) { sim.tick(); clamp(); }
    render();
  } else {
    sim.on('tick', () => { clamp(); render(); });
    nodeSel.filter((d) => d.kind !== 'hub').call(
      drag<SVGGElement, Node>()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.2).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }),
    );
  }

  // ---- Interaction ----
  const info = document.getElementById('map-info')!;
  const infoDomain = info.querySelector<HTMLElement>('[data-info-domain]')!;
  const infoTitle = info.querySelector<HTMLElement>('[data-info-title]')!;
  const infoNote = info.querySelector<HTMLElement>('[data-info-note]')!;
  const defaults = [infoDomain.textContent, infoTitle.textContent, infoNote.textContent];

  const highlight = (d: Node | null) => {
    if (!d) {
      nodeSel.attr('opacity', 1);
      linkSel.attr('stroke-opacity', (l) => (l.kind === 'cross' ? 0.45 : l.kind === 'member' ? 0.16 : 0.08));
      capLabels.attr('opacity', compact ? 0 : 1).attr('fill', '#A7A49C');
      focusRing.attr('opacity', 0);
      [infoDomain.textContent, infoTitle.textContent, infoNote.textContent] = defaults;
      return;
    }
    const near = new Set([d.id, ...(neighbours.get(d.id) ?? [])]);
    nodeSel.attr('opacity', (n) => (near.has(n.id) ? 1 : 0.18));
    linkSel.attr('stroke-opacity', (l) => {
      const s = (l.source as Node).id, t = (l.target as Node).id;
      return s === d.id || t === d.id ? 0.9 : 0.03;
    });
    capLabels.attr('opacity', (n) => (near.has(n.id) ? 1 : compact ? 0 : 0.25))
      .attr('fill', (n) => (n.id === d.id ? '#F2C230' : '#E4E1D9'));
    focusRing.attr('opacity', (n) => (n.id === d.id ? 1 : 0));

    if (d.kind === 'work') {
      infoDomain.textContent = 'Case study';
      infoTitle.textContent = d.label;
      infoNote.textContent = `Proves: ${(d.caps ?? []).map((c) => byId.get(c)?.label).filter(Boolean).join(', ')}.`;
    } else if (d.kind === 'hub') {
      const count = nodes.filter((n) => n.kind === 'cap' && n.domain === d.domain).length;
      infoDomain.textContent = 'Domain';
      infoTitle.textContent = d.label;
      infoNote.textContent = `${count} capabilities. Gold lines show where they depend on the other domains.`;
    } else {
      infoDomain.textContent = DOMAIN_NAME[d.domain!];
      infoTitle.textContent = d.label;
      infoNote.textContent = d.note ?? '';
    }
  };

  let pinned: Node | null = null;
  nodeSel
    .on('mouseenter', (_, d) => { if (!pinned) highlight(d); })
    .on('mouseleave', () => { if (!pinned) highlight(null); })
    .on('focus', (_, d) => highlight(d))
    .on('blur', () => { if (!pinned) highlight(null); })
    .on('click', (e, d) => { e.stopPropagation(); pinned = pinned === d ? null : d; highlight(pinned); })
    .on('keydown', (e: KeyboardEvent, d) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pinned = pinned === d ? null : d; highlight(pinned); }
      if (e.key === 'Escape') { pinned = null; highlight(null); }
    });
  svg.on('click', () => { pinned = null; highlight(null); });
}
