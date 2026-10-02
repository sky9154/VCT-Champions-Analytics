import { Link } from "react-router-dom";


const NotFoundPage = () => (
  <section className="not-found-page page-container" aria-labelledby="not-found-title">
    <span className="not-found-code">404 <span>/ 找不到頁面</span></span>
    <h1 id="not-found-title" tabIndex={-1}>找不到頁面</h1>
    <p>網址可能有誤，或頁面尚未建立。可返回總覽，或使用上方導覽前往其他頁面。</p>
    <Link className="primary-link-button" to="/">返回總覽 <span aria-hidden="true">↗</span></Link>
  </section>
);

export { NotFoundPage };