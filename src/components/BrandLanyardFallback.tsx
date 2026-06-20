import './BrandLanyardFallback.css'

export default function BrandLanyardFallback() {
  return <div className="brand-lanyard-fallback" aria-label="唯吾品牌吊牌">
    <svg className="brand-fallback-rope" viewBox="0 0 190 135" aria-hidden="true"><path d="M18 -8 C 20 42, 72 22, 88 75 S 135 104, 142 132"/><path d="M27 -8 C 30 32, 78 22, 96 72 S 137 99, 151 128"/></svg>
    <a href="#top" className="brand-fallback-card" aria-label="唯吾首页">
      <span className="brand-fallback-index">WEIWU / 00</span>
      <span className="brand-fallback-ink"><b>吾</b></span>
      <strong>唯吾</strong>
      <small>装修行业 IP 运营<br/>与内容获客服务商</small>
      <i/>
    </a>
  </div>
}
