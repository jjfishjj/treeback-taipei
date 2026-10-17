# TreeBack CI/CD 與 GitHub Pages

此流程適用於使用者確認建立的獨立公開儲存庫 `jeromepolyglot-jpg/treeback-taipei`。它不修改 Manus 的管理 origin，不是 canonical 切換，也不自動把兩個儲存庫互相同步。程式碼維護者應在公開 GitHub 工作副本建立分支、提交並送 PR；若要回到 Manus 預覽，應另行同步已核准版本，不要直接改寫或強制推送既有 history。

## 本機驗證

使用 Node.js 22 以上與 pnpm 11.25.0。執行 `pnpm install --frozen-lockfile`，再依序執行 `pnpm check`、`pnpm test`、`pnpm exec playwright install chromium`、`pnpm test:e2e` 和 `pnpm build`。瀏覽器測試啟動專用伺服器，測試 `dist` 在 `/treeback-taipei/` 的載入與互動，不使用開發伺服器來冒充正式建置測試。測試不依賴官方資料 API 或 Google Fonts 網路狀態。

## 遠端測試和部署

`.github/workflows/ci.yml` 在 main push、PR 及手動操作時做語法、模型、資料欄位和桌機／手機 Chromium 測試。外部 fork PR 只能讀程式，沒有 Pages、OIDC 或部署權限；首次外部貢獻可能需要維護者在 GitHub 核准測試執行。不要改成 pull_request_target。[2]

`.github/workflows/pages.yml` 在 main push 或手動執行時重用同一 CI 定義。只有測試成功後才建置與上傳 `dist`，再以獨立部署 job 發布 GitHub Pages。部署 job 只取得 `pages: write` 與 `id-token: write`；沒有私人 PAT。main 自己的 CI 與 Pages 中的測試都可能執行，這是刻意保持部署測試閘門而非依賴不相關的綠色狀態。[1]

## GitHub Pages 首次設定

儲存庫建立後需將 Settings → Pages → Source 設成 GitHub Actions，或由獲授權的管理者呼叫 GitHub Pages API 設定 `build_type=workflow`。初始程式推送前完成這一步，可避免 configure-pages 的首次失敗；若因首次 Pages 啟用較晚而失敗，核對設定後只重跑受影響的部署流程。[1]

預期網址為 `https://jeromepolyglot-jpg.github.io/treeback-taipei/`。**這是預期網址，只有遠端 workflow 成功且實際 HTTP 可讀取後，才可宣稱已部署。** 提交 workflow 或本機測試成功不等於遠端成功。建置物不包含套件、測試、憑證或整個儲存庫。

## 安全與維護

第三方 Actions 固定完整提交 SHA，pnpm 固定版本，依賴固定在 lockfile。更新時核對官方來源和套件變更，經 PR 跑測試再合併。發布資料只包括明示的合成情境、空白候選範本與作業設計；不可上傳私人通報、可識別影像或 GitHub／政府 API 金鑰。

若 build 失敗，先檢查 Node/pnpm 版本及 lockfile；若瀏覽器失敗，檢查 Actions 的 failure artifact，避免直接跳過測試。若部署 404，核對資源是否為 `./` 相對路徑、dist 是否含 index.html、Pages Source 是否為 Actions。若 Pages 未執行，核對推送權限、Actions 政策和 workflow 是否在 main，不以手動改寫 gh-pages 分支繞過測試閘門。

## References

[1]: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages "GitHub 官方自訂 Pages 工作流程"
[2]: https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target "GitHub 官方 PR 工作流程安全界線"
