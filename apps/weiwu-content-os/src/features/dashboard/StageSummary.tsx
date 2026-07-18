import type { StageSummary as StageSummaryData } from '../../repositories/dashboardRepository'

const cards = [
  { label: '脚本', stages: ['no_script', 'scripting'] as const, hint: '确定方向与表达' },
  { label: '待拍', stages: ['ready_to_shoot'] as const, hint: '确认时间与镜头' },
  { label: '拍摄中', stages: ['shooting'] as const, hint: '现场记录与补拍' },
  { label: '待剪辑', stages: ['shot_waiting_edit'] as const, hint: '素材已准备完毕' },
  { label: '待发布', stages: ['ready_to_publish'] as const, hint: '发布前最终校验' }
]

export function StageSummary({ summary }: { summary: StageSummaryData }) {
  return (
    <section className="stage-summary" aria-labelledby="stage-summary-title">
      <div className="section-title-row"><div><p className="eyebrow">WORKFLOW STATUS</p><h2 id="stage-summary-title">当前流程</h2></div><span>只统计已记录内容</span></div>
      <div className="stage-summary-grid">{cards.map((card, index) => {
        const count = card.stages.reduce((total, stage) => total + summary[stage], 0)
        return <article className="stage-summary-card" key={card.label}><span>0{index + 1}</span><strong>{count}</strong><h3>{card.label}</h3><p>{card.hint}</p></article>
      })}</div>
    </section>
  )
}
