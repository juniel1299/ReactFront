import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axiosInstance";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import * as am4core from "@amcharts/amcharts4/core";
import * as am4charts from "@amcharts/amcharts4/charts";
import am4themes_animated from "@amcharts/amcharts4/themes/animated";
am4core.useTheme(am4themes_animated);

// 안전한 숫자 포매터
const fmt = (n) => (isFinite(n) ? Number(n).toLocaleString() : "0");

// 문자열/이상값 → 숫자 변환 (콤마/공백/% 제거)
const toNum = (v) => {
  if (v == null) return 0;
  if (typeof v === "number") return isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^\d.\-]/g, ""); // 숫자/소수점/음수만
    const n = parseFloat(cleaned);
    return isFinite(n) ? n : 0;
  }
  return 0;
};

const AccountPage = () => {
  // ───────────────────────────────── charts refs
  const stackedDiv = useRef(null);
  const groupedDiv = useRef(null);
  const stackedRef = useRef(null);
  const groupedRef = useRef(null);

  // ───────────────────────────────── 1) 차트 생성 (useLayoutEffect 1회씩)
  useLayoutEffect(() => {
    let rafGrouped = 0;

    // 스택형(왼쪽)
    if (stackedDiv.current) {
      const chart = am4core.create(stackedDiv.current, am4charts.XYChart);
      stackedRef.current = chart;

      const x = chart.xAxes.push(new am4charts.CategoryAxis());
      x.dataFields.category = "category"; // 단일 카테고리: "TOTAL"
      x.renderer.grid.template.disabled = true;
      x.renderer.minGridDistance = 20;
      x.renderer.cellStartLocation = 0.2;
      x.renderer.cellEndLocation = 0.8;

      const y = chart.yAxes.push(new am4charts.ValueAxis());
      y.min = 0;
      y.max = 100;
      y.strictMinMax = true;
      y.extraMin = 0;
      y.extraMax = 0; // 100% 고정

      chart.maskBullets = false;
      chart.legend = new am4charts.Legend();
      chart.cursor = new am4charts.XYCursor();
      chart.cursor.lineX.disabled = true;
      chart.cursor.lineY.disabled = false;
    }

    // 그룹형(오른쪽) — 초기 0폭 방지: 다음 프레임 생성
    const createGrouped = () => {
      if (!groupedDiv.current) return;
      const chart = am4core.create(groupedDiv.current, am4charts.XYChart);
      groupedRef.current = chart;

      const x = chart.xAxes.push(new am4charts.CategoryAxis());
      x.dataFields.category = "bucket"; // 지역명
      x.renderer.minGridDistance = 30;
      x.renderer.cellStartLocation = 0.1;
      x.renderer.cellEndLocation = 0.9;

      const y = chart.yAxes.push(new am4charts.ValueAxis());
      y.min = 0;

      chart.maskBullets = false;
      chart.legend = new am4charts.Legend();
      chart.cursor = new am4charts.XYCursor();
      chart.cursor.lineX.disabled = true;
      chart.cursor.lineY.disabled = false;

      // ✅ 단일 시리즈 1개를 “미리” 생성
      const s = chart.series.push(new am4charts.ColumnSeries());
      s.name = "값";
      s.dataFields.categoryX = "bucket";
      s.dataFields.valueY = "value";
      s.columns.template.width = am4core.percent(70);

      // 툴팁(흰 배경/검정 글자/라운드/포인터 제거/테두리는 막대색과 동기화)
      s.tooltipText = "{categoryX}: {valueY.formatNumber('#,##0')}";
      s.tooltip.getFillFromObject = false;
      s.tooltip.getStrokeFromObject = false;
      s.tooltip.background.fill = am4core.color("#fff");
      s.tooltip.background.pointerLength = 0;
      s.tooltip.background.cornerRadius = 8;
      s.tooltip.label.fill = am4core.color("#000");
      s.adapter.add("fill", (fill) => {
        if (s.tooltip) s.tooltip.background.stroke = fill;
        return fill;
      });
      s.adapter.add("stroke", (stroke) => {
        if (s.tooltip) s.tooltip.background.stroke = stroke;
        return stroke;
      });
    };

    rafGrouped = requestAnimationFrame(createGrouped);

    return () => {
      cancelAnimationFrame(rafGrouped);
      if (stackedRef.current) stackedRef.current.dispose();
      if (groupedRef.current) groupedRef.current.dispose();
      stackedRef.current = null;
      groupedRef.current = null;
    };
  }, []);

  // ───────────────────────────────── 2) 데이터 호출 → 두 차트에 주입
  const fetchAndDrawChart = async () => {
    try {
      const res = await axios.get("/admin/getChart"); // 실제 API
      const raw = res?.data || []; // [{ GUBUN:'서울', DATA_13:120 }, ...]
      const rows = Array.isArray(raw) ? raw : [];

      // 공통 파싱 (키/값 페어로 정리)
      const pairs = rows
        .map((r) => ({
          key: String(r.GUBUN ?? r.gubun ?? r.name ?? r.bucket ?? "").trim(),
          val: toNum(
            r.DATA_13 ??
              r.data_13 ??
              r.DATA13 ??
              r.data13 ??
              r.VALUE ??
              r.value ??
              r.val
          ),
        }))
        .filter((p) => p.key);

      // ── A) 스택형: 한 줄 스택 + 100% 환산
      if (stackedRef.current) {
        const chart = stackedRef.current;

        // 원시값 → 한 줄 스택
        const datumAbs = { category: "TOTAL" };
        pairs.forEach((p) => {
          datumAbs[p.key] = p.val;
        });

        // 총합/퍼센트 환산
        const seriesKeys = Object.keys(datumAbs).filter((k) => k !== "category");
        const total = seriesKeys.reduce(
          (s, k) => s + (toNum(datumAbs[k]) || 0),
          0
        );
        const datumPct = { category: "TOTAL" };
        seriesKeys.forEach((k) => {
          const v = toNum(datumAbs[k]) || 0;
          datumPct[k] = total ? (v * 100) / total : 0;
        });

        // 시리즈 동기화(없으면 생성, 불필요 제거)
        const exist = new Map();
        chart.series.each((s) => {
          if (s instanceof am4charts.ColumnSeries) exist.set(s.name, s);
        });
        exist.forEach((s, name) => {
          if (!seriesKeys.includes(name)) s.dispose();
        });
        seriesKeys.forEach((key) => {
          if (!exist.has(key)) {
            const s = chart.series.push(new am4charts.ColumnSeries());
            s.name = key;
            s.dataFields.categoryX = "category";
            s.dataFields.valueY = key;
            s.stacked = true;

            // 막대 두께
            s.columns.template.width = am4core.percent(60);

            // 막대 안 퍼센트 라벨
            const lb = s.bullets.push(new am4charts.LabelBullet());
            lb.locationY = 0.5;
            lb.label.text = "{valueY.formatNumber('#.0')}%";
            lb.label.fill = am4core.color("#fff");
            lb.label.fontSize = 12;
            lb.label.truncate = false;
            lb.label.hideOversized = false;

            // 툴팁(흰 배경/검정 글자/라운드/포인터 제거/테두리는 막대색 동기화)
            s.tooltipText = "{name} {valueY.formatNumber('#.0')}%";
            s.tooltip.getFillFromObject = false;
            s.tooltip.getStrokeFromObject = false;
            s.tooltip.background.fill = am4core.color("#fff");
            s.tooltip.background.pointerLength = 0;
            s.tooltip.background.cornerRadius = 8;
            s.tooltip.label.fill = am4core.color("#000");
            s.adapter.add("fill", (fill) => {
              if (s.tooltip) s.tooltip.background.stroke = fill;
              return fill;
            });
            s.adapter.add("stroke", (stroke) => {
              if (s.tooltip) s.tooltip.background.stroke = stroke;
              return stroke;
            });
          }
        });

        // 데이터 주입(퍼센트)
        chart.data = [datumPct];
        chart.invalidateRawData();

        // 총합 라벨(원시 총합 표기) — 중복 방지 후 생성
        const old = chart.chartContainer.children.values.find(
          (c) => c && c.userClassName === "totalLabel"
        );
        if (old) old.dispose();

        const totalLabel = chart.chartContainer.createChild(am4core.Label);
        totalLabel.userClassName = "totalLabel";
        totalLabel.text = `총합\n${fmt(total)}`;
        totalLabel.align = "center";
        totalLabel.isMeasured = true;
        totalLabel.marginTop = 8;
        totalLabel.interactionsEnabled = true;
        totalLabel.cursorOverStyle = am4core.MouseCursorStyle.pointer;
        totalLabel.events.on("hit", () => {
          window.open(
            `/popup?a=TOTAL&sum=${encodeURIComponent(total)}`,
            "sumPopup",
            "width=600,height=700"
          );
        });
      }

      // ── B) 그룹형: 지역별 단일 시리즈(원시값)
      if (groupedRef.current) {
        const chart = groupedRef.current;

        // 카테고리 배열 [{ bucket, value }]
        const barRows =
          pairs
            .map((p) => ({
              bucket: p.key,
              value: toNum(p.val),
            }))
            .filter((r) => r.bucket) || [];

        // 시리즈가 없으면(초기화 이후 등) 다시 생성
        if (chart.series.length === 0) {
          const s = chart.series.push(new am4charts.ColumnSeries());
          s.name = "값";
          s.dataFields.categoryX = "bucket";
          s.dataFields.valueY = "value";
          s.columns.template.width = am4core.percent(70);
          s.tooltipText = "{categoryX}: {valueY.formatNumber('#,##0')}";
          s.tooltip.getFillFromObject = false;
          s.tooltip.getStrokeFromObject = false;
          s.tooltip.background.fill = am4core.color("#fff");
          s.tooltip.background.pointerLength = 0;
          s.tooltip.background.cornerRadius = 8;
          s.tooltip.label.fill = am4core.color("#000");
          s.adapter.add("fill", (fill) => {
            if (s.tooltip) s.tooltip.background.stroke = fill;
            return fill;
          });
          s.adapter.add("stroke", (stroke) => {
            if (s.tooltip) s.tooltip.background.stroke = stroke;
            return stroke;
          });
        }

        // 차트에 한 번에 주입
        chart.data = barRows;
        chart.invalidateRawData();

        // (옵션) 전부 0이면 y축이 너무 타이트할 수 있어 임시로 0~1 지정
        const hasPositive = barRows.some((r) => r.value > 0);
        if (!hasPositive) {
          const y = chart.yAxes.getIndex(0);
          if (y) {
            y.min = 0;
            y.max = 1;
            y.strictMinMax = true;
          }
        }
      }
    } catch (e) {
      console.error(e);
      alert("차트 데이터를 불러오지 못했습니다.");
    }
  };

  // ───────────────────────────────── 아래는 Ag-Grid 네 코드(거의 그대로)
  const gridRef = useRef(null);
  const [rowData, setRowData] = useState([]);
  const [gridApi, setGridApi] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user || user.role !== "ROLE_ADMIN") {
      alert("접근 권한이 없습니다.");
      navigate("/");
    }
  }, [navigate]);

  const columnDefs = [
    {
      headerName: "",
      checkboxSelection: (node) => console.log(node, "????"),
      headerCheckboxSelection: true,
      width: 50,
      pinned: "left",
      suppressMenu: true,
      suppressMovable: true,
    },
    {
      headerName: "상태",
      field: "state",
      width: 80,
      editable: false,
      cellStyle: { textAlign: "center" },
    },
    {
      headerName: "아이디",
      field: "userId",
      editable: false,
      sortable: false,
      headerCellRenderer: makeCopyableHeaderFromParams,
    },
    { headerName: "이름", field: "username", editable: true },
    { headerName: "권한", field: "role", editable: true },
    { headerName: "언어", field: "locale", editable: true },
    { headerName: "사용여부", field: "useYn", editable: true },
    { headerName: "전화번호", field: "phone", editable: true },
    { headerName: "이메일", field: "email", editable: true },
  ];

  const defaultColDef = { editable: true, resizable: true };

  const onGridReady = (params) => setGridApi(params.api);

  const onCellValueChanged = (params) => {
    if (params.data.state !== "D") {
      params.node.setDataValue("state", "U");
    }
  };

  const markRowAsDeleted = () => {
    if (!gridApi) return;
    const selectedNodes = gridApi.getSelectedNodes();
    selectedNodes.forEach((node) => node.setDataValue("state", "D"));
  };

  const handleSave = () => {
    if (!gridApi) return;
    const changed = [];
    gridApi.forEachNode((node) => {
      if (node.data.state !== "R") changed.push(node.data);
    });
    if (changed.length === 0) {
      alert("변경된 데이터가 없습니다.");
      return;
    }
    axios
      .post("/admin/edit", changed)
      .then(() => {
        alert("저장 완료");
        return axios.get("/admin/users");
      })
      .then((res) => {
        const freshData = res.data.map((row) => ({
          userId: row.USER_ID,
          username: row.USERNAME,
          role: row.ROLE,
          locale: row.LOCALE,
          useYn: row.USE_YN,
          phone: row.PHONE,
          email: row.EMAIL,
          createdAt: row.CREATED_AT,
          updatedAt: row.UPDATED_AT,
          state: "R",
        }));
        setRowData(freshData);
      })
      .catch((err) => {
        console.error(err);
        alert("저장 실패");
      });
  };

  useEffect(() => {
    axios.get("/admin/users").then((res) => {
      const withState = res.data.map((row) => ({
        userId: row.USER_ID,
        username: row.USERNAME,
        role: row.ROLE,
        locale: row.LOCALE,
        useYn: row.USE_YN,
        phone: row.PHONE,
        email: row.EMAIL,
        createdAt: row.CREATED_AT,
        updatedAt: row.UPDATED_AT,
        state: "R",
      }));
      setRowData(withState);
    });
  }, []);

  function makeCopyableHeader(text) {
    const div = document.createElement("div");
    div.innerText = text;
    div.style.cursor = "pointer";
    div.style.userSelect = "text";
    div.onclick = () => navigator.clipboard.writeText(text);
    return div;
  }
  function makeCopyableHeaderFromParams(params) {
    return makeCopyableHeader(params.colDef.headerName);
  }

  // ───────────────────────────────── UI
  return (
    <div style={{ padding: 20 }}>
      <h2 className="text-xl font-bold mb-4">계정 관리</h2>

      <div className="mb-4 space-x-2">
        <button
          className="px-4 py-2 bg-red-500 text-white rounded"
          onClick={markRowAsDeleted}
        >
          - 삭제
        </button>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded"
          onClick={handleSave}
        >
          저장
        </button>
      </div>

      <div className="ag-theme-alpine" style={{ height: 500 }}>
        {/* <AgGridReact
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          enableRangeSelection={true}
          suppressClipboardPaste={false}
          suppressCellFocus={false}
          rowSelection="multiple"
          defaultColDef={defaultColDef}
          onGridReady={onGridReady}
          onCellValueChanged={onCellValueChanged}
          getRowId={(params) => params.data.userId}
          getRowStyle={(params) =>
            params.data.state === "D" ? { textDecoration: "line-through", background: "#fee" } : {}
          }
        /> */}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <button
          onClick={fetchAndDrawChart}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          차트 불러오기
        </button>
      </div>

      {/* 차트 두 개 나란히 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginTop: 20,
        }}
      >
        <div>
          <div className="font-semibold mb-2">스택형 (100% 환산)</div>
          <div ref={stackedDiv} style={{ width: "100%", height: 420 }} />
        </div>
        <div>
          <div className="font-semibold mb-2">세로 막대 (그룹형)</div>
          <div ref={groupedDiv} style={{ width: "100%", height: 420 }} />
        </div>
      </div>
    </div>
  );
};

export default AccountPage;