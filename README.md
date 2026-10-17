# TreeBack 台北見縫插樹／樹蔭公平情境實驗室

A transparent, interactive shade-equity scenario lab for Taipei civic-tech collaboration.

TreeBack 關心的不只是「補植幾棵」，而是樹蔭能否回到市民每天步行、候車與生活的地方。這個輕量公民科技原型讓市民、環團與市府人員用相同的公式比較需求，並把補植需求與現地可行性分開討論。

**本版 12 區輸入、24% 樹冠目標與分級均為展示假設，不是市府實測，也不是 American Forests 官方 Tree Equity Score。** 區級排序不是空穴清單、經費分配依據或植樹許可。大同與萬華的 48 小時盤點方案尚未實際執行。

## 展示與功能

[GitHub Pages 預定網址](https://jeromepolyglot-jpg.github.io/treeback-taipei/)在首次部署成功前尚未生效。CI 與部署狀態請看 GitHub Actions 的實際執行紀錄，而不是僅看工作流程檔案是否存在。

目前可操作的功能包括 H／P／V 權重滑桿、快速情境、12 區 TES／PPI 即時比較、基準差值與名次變化、行政區計算拆解及 CSV 匯出。調整一項權重時，其他兩項按原比例重新分配，總和保持 100%。

「48h 街區行動」頁提供大同與萬華的候選初篩、抽樣、合法影像和有限現勘作業設計，並附空白候選紀錄。所有候選列均為格式示例，沒有實際點位或核准結果。地圖／GIS 串接、政府 API、自動樹冠辨識與 Tree Guardian 工程預警仍是未實作項目。

## 給黑客松評審：3 分鐘展示

1. **0:00–0:30：問題與邊界。** 說明樹蔭公平與生活圈需求，指出首頁的情境假設提示。
2. **0:30–1:15：互動模型。** 調整熱暴露、人口或脆弱度權重，观察總和保持 100%，比較 12 區分數與排名。
3. **1:15–1:50：可解釋性。** 切換 TES／PPI、點選行政區，展示缺口 G、需求 S、分數差值與 CSV。
4. **1:50–2:30：需求不等於可種。** 進入大同／萬華方案，說明 60 個街段單側抽樣框與最多 12 個有限現勘的規劃，展示權管、通行、管線及根域待查欄位。
5. **2:30–3:00：可交付下一步。** 展示來源頁、空白範本與 Actions 測試；提出合法資料快照和跨局處實地試辦，而不承諾已完成補植。

## 快速啟動

需要 Node.js 22 以上；pnpm 固定為 11.25.0。若尚未安裝：

```sh
npm install --global pnpm@11.25.0
```

在專案目錄執行：

```sh
pnpm install --frozen-lockfile
pnpm dev
```

開啟 `http://localhost:3000`。網站是原生 HTML／CSS／ESM 純前端，沒有登入、資料庫或 API 金鑰。不要用 `file://` 直接開啟 ESM 入口。Google Fonts 失敗時會使用備用字型，不影響模型。

```sh
pnpm check                         # JavaScript 語法
pnpm test                          # 模型、CSV、來源格式和 Actions 合約
pnpm exec playwright install chromium
pnpm test:e2e                      # 桌機與手機 Chromium 互動
pnpm build                         # public → dist 靜態建置
```

`package.json` 的 `private: true` 是防止意外發布 npm 套件，不是 GitHub 儲存庫可見性。Playwright、YAML 與 pnpm 的版本固定，依賴由 `pnpm-lock.yaml` 重現。

## 計算模型

C 使用百分點，例如 10 表示假設樹冠率 10%；H、P、V 是 0–1 情境代理值。權重 wH、wP、wV 使用百分點，預設 40／35／25，總和 100。

```text
G   = clip(1 − C / 24, 0, 1)
S   = (wH × H + wP × P + wV × V) / 100
PPI = 100 × G × (0.5 + 0.5 × S)
TES = 100 − PPI
```

`clip` 將值夾限在 0–1。TES 越低表示**在這組假設下**補植需求越高，PPI 則相反；兩者相加為 100。公式以完整精度計算和排序，再格式化顯示。12 區平均為簡單平均，不是人口加權平均。

當另外兩項權重都是 0 時，剩餘權重均分；整数取捨後仍補足至 100%。PPI 高／中／低色帶的 40／20 分門檻僅作展示，沒有法定或官方意義。高 TES 不代表熱風險低或樹冠已達真實政策目標。

## 技術結構

```text
public/                    網站、模型、資料來源與公開下載
scripts/                   靜態建置、開發／測試伺服器、語法檢查
tests/*.test.mjs           Node 模型、資料與工作流程合約
tests/e2e/                 真實 Chromium 桌機／手機互動
playwright.config.mjs      在 /treeback-taipei/ 測試正式 dist
.github/workflows/ci.yml    PR、main 與手動測試
.github/workflows/pages.yml 測試通過後部署 GitHub Pages
CONTRIBUTING.md            社群及 AI agent 貢獻流程
THIRD_PARTY_NOTICES.md      程式授權與外部內容的界線
```

內部資源使用相對路徑，支援根網址及 GitHub Pages 專案子路徑。執行環境不依賴 Manus 服務；Manus 預覽與獨立開源副本之間的同步不是自動雙向同步。

## CI/CD

[CI 工作流程](.github/workflows/ci.yml)在 PR、main push 或手動觸發時執行語法、模型／資料合約、桌機／手機瀏覽器及建置檢查。[Pages 工作流程](.github/workflows/pages.yml)在同一提交上重用 CI，成功後才上傳並部署 `dist`。

PR 測試只有讀取權限，不使用 `pull_request_target`。部署 job 與測試隔離，只取得 Pages 與 OIDC 最低權限，不使用私人 PAT；第三方 Actions 固定完整提交 SHA。Pages 首次需要將儲存庫發布來源設為 **GitHub Actions**。更多設定與故障排除見 [部署指南](docs/DEPLOYMENT.md)。工作流程不等於分支保護規則；維護者仍應審查 PR，並按需要設定 required checks。

## 資料與街景界線

本版假設值沒有由官方樹冠、人口或熱資料回算。H 不是氣溫或百分位數，P 不是日間人流，V 不是居民健康紀錄。真實導入時須對齊年份、生活圈尺度、正規化參照、缺值和資料信心，不可直接把區級分數下放到街段。

大同、萬華每區規劃 30 個「100 m 街段 × 單側」抽樣單位，三層各 8 個定向＋2 個固定對照；每區最多 6 個有限現勘。60／12 是規劃目標與上限，不是成果。樹穴未匹配樹木只能標待核；土地、無障礙通行、管線、交通視距、根域、土壤與養護仍須現勘或主管確認。

影像證據使用自攝或逐筆確認允許保存與衍生特徵的授權來源。**Google Street View 不截圖、不下載、不人工描繪／編碼，也不以 AI 擷取特徵**；只作外部位置參考。缺資料保留 `null`，不要為達成樣本數而虛構記錄。

[樹木與樹穴資料](https://data.taipei/dataset/detail?id=7a49d00c-a5ff-4a6b-be9e-aaa6dc1ff7e8)、[人行道範圍](https://data.gov.tw/dataset/134905)、[樹穴圖資](https://data.gov.tw/dataset/134908)與[里別年齡人口](https://data.taipei/dataset/detail?id=a6394e3f-3514-4542-87bd-de4310a40db3)是未來可評估的官方來源，不代表已完成串接。完整方法在 [抽樣作業規格](public/downloads/site-sampling-plan.md)，影像限制見 [Google 官方指引](https://about.google/brand-resource-center/products-and-services/geo-guidelines)。

## 社群下一步

優先補齊合法資料快照與欄位治理，再設計里別／格網需求指數及可審計的候選流程。之後可與在地團體做有限現勘，分別公布「抽樣框、合法影像、已現勘、專業確認、核准」數量。Tree Guardian、工程公告訂閱及跨局處資料介接是後續提案，不是現在已完成的能力。

歡迎從文件、無障礙、模型敏感度、資料字典或測試開始；先讀 [CONTRIBUTING.md](CONTRIBUTING.md)，建立 Issue → 分支 → PR。AI agent 可以提出修改和測試，但不能自行授權合併、改公開性或處理秘密。

## 授權

本版準備以 [MIT](LICENSE)開放自有程式與合成情境；首次公開推送前須由擁有者確認。第三方圖資、影像、論文、商標與字型依原條款，不因程式碼 MIT 授權而取得同樣權利；見 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
