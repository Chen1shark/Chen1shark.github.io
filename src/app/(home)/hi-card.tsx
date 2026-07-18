import { useCenterStore } from '@/hooks/use-center'
import Card from '@/components/card'
import { useConfigStore } from './stores/config-store'
import { HomeDraggableLayer } from './home-draggable-layer'

export default function HiCard() {
	const center = useCenterStore()
	const { cardStyles, siteContent } = useConfigStore()
	const styles = cardStyles.hiCard
	const username = siteContent.meta.username || 'Chen1shark'

	const x = styles.offsetX !== null ? center.x + styles.offsetX : center.x - styles.width / 2
	const y = styles.offsetY !== null ? center.y + styles.offsetY : center.y - styles.height / 2

	return (
		<HomeDraggableLayer cardKey='hiCard' x={x} y={y} width={styles.width} height={styles.height}>
			<Card order={styles.order} width={styles.width} height={styles.height} x={x} y={y} className='relative flex flex-col items-center justify-center text-center max-sm:static max-sm:translate-0'>
				{siteContent.enableChristmas && (
					<>
						<img
							src='/images/christmas/snow-1.webp'
							alt='Christmas decoration'
							className='pointer-events-none absolute'
							style={{ width: 180, left: -20, top: -25, opacity: 0.9 }}
						/>
						<img
							src='/images/christmas/snow-2.webp'
							alt='Christmas decoration'
							className='pointer-events-none absolute'
							style={{ width: 160, bottom: -12, right: -8, opacity: 0.9 }}
						/>
					</>
				)}
				<div className='flex h-[112px] w-[112px] items-center justify-center overflow-hidden rounded-full border-2 border-white/80 bg-white/45 shadow-[0_16px_32px_-10px_#c7d7df]'>
					<img
						src='/images/avatar.png'
						alt={`${username} 的头像`}
						className='h-full w-full object-cover'
						onError={event => {
							event.currentTarget.style.display = 'none'
						}}
					/>
				</div>
				<h1 className='font-averia mt-4 text-[30px] leading-none font-medium'>{username}</h1>
				<p className='text-secondary mt-3 max-w-[280px] text-sm leading-6'>{siteContent.meta.description}</p>
			</Card>
		</HomeDraggableLayer>
	)
}
