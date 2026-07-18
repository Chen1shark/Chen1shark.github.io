import Card from '@/components/card'
import { useCenterStore } from '@/hooks/use-center'
import { useBlogIndex } from '@/hooks/use-blog-index'
import { useConfigStore } from './stores/config-store'
import { CARD_SPACING } from '@/consts'
import { Hash } from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'
import { HomeDraggableLayer } from './home-draggable-layer'

export default function TechStackCard() {
	const center = useCenterStore()
	const { cardStyles } = useConfigStore()
	const { items } = useBlogIndex()
	const styles = cardStyles.techStackCard
	const hiCardStyles = cardStyles.hiCard
	const tags = useMemo(() => {
		const counts = new Map<string, number>()
		for (const item of items) {
			for (const tag of item.tags || []) {
				counts.set(tag, (counts.get(tag) || 0) + 1)
			}
		}
		return Array.from(counts.entries())
			.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
			.slice(0, 6)
			.map(([tag, count]) => ({ tag, count }))
	}, [items])

	const x = styles.offsetX !== null ? center.x + styles.offsetX : center.x - styles.width / 2
	const y = styles.offsetY !== null ? center.y + styles.offsetY : center.y - hiCardStyles.height / 2 - styles.height - CARD_SPACING / 2

	return (
		<HomeDraggableLayer cardKey='techStackCard' x={x} y={y} width={styles.width} height={styles.height}>
			<Card order={styles.order} width={styles.width} height={styles.height} x={x} y={y} className='max-sm:static max-sm:translate-0'>
				<div className='flex items-center justify-between'>
					<div>
						<h2 className='text-base font-medium'>常用标签</h2>
						<p className='text-secondary mt-1 text-xs'>按技术主题快速查找</p>
					</div>
					<Hash className='text-brand h-7 w-7' />
				</div>

				<div className='mt-5 flex flex-wrap gap-2'>
					{tags.length > 0 ? (
						tags.map(item => (
							<Link
								key={item.tag}
								href={`/blog?tag=${encodeURIComponent(item.tag)}`}
								className='flex items-center gap-2 rounded-xl bg-white/45 px-3 py-2 text-sm transition-colors hover:bg-white/70 hover:text-brand'>
								<span>#{item.tag}</span>
								<span className='text-secondary text-xs'>{item.count}</span>
							</Link>
						))
					) : (
						<div className='text-secondary rounded-xl bg-white/35 px-3 py-2 text-sm'>暂无标签</div>
					)}
				</div>
			</Card>
		</HomeDraggableLayer>
	)
}
