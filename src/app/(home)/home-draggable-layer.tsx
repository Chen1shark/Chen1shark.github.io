import type { CardStyles } from './stores/config-store'

interface HomeDraggableLayerProps {
	cardKey: keyof CardStyles
	x: number
	y: number
	width?: number
	height?: number
	children: React.ReactNode
}

// 首页布局固定由配置文件控制，不再提供浏览器端拖拽或缩放编辑。
export function HomeDraggableLayer({ children }: HomeDraggableLayerProps) {
	return children
}
