import { useEffect, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axiosInstance";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

const AccountPage = () => {
  const gridRef = useRef(null);
  const [rowData, setRowData] = useState([]);
  const [gridApi, setGridApi] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || user.role !== "ROLE_ADMIN") {
      alert("접근 권한이 없습니다.");
      navigate("/");
    }
  }, []);

  const columnDefs = [
    { headerName: "상태", field: "state", width: 80, editable: false, cellStyle: { textAlign: "center" } },
    { headerName: "아이디", field: "userId", editable: false },
    { headerName: "이름", field: "username", editable: true },
    { headerName: "권한", field: "role", editable: true },
    { headerName: "언어", field: "locale", editable: true },
    { headerName: "사용여부", field: "useYn", editable: true },
    { headerName: "전화번호", field: "phone", editable: true },
    { headerName: "이메일", field: "email", editable: true },
  ];

  const defaultColDef = {
    editable: true,
    resizable: true,
  };

  const onGridReady = (params) => {
    setGridApi(params.api);
  };

  const onCellValueChanged = (params) => {
    if (params.data.state !== "D") {
      params.node.setDataValue("state", "U");
    }
  };

  const markRowAsDeleted = () => {
    if (!gridApi) return;
    const selectedNodes = gridApi.getSelectedNodes();
    selectedNodes.forEach((node) => {
      node.setDataValue("state", "D");
    });
  };

  const handleSave = () => {
    if (!gridApi) return;
    const changed = [];
    gridApi.forEachNode((node) => {
      if (node.data.state !== "R") {
        changed.push(node.data);
      }
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

  return (
    <div style={{ padding: 20 }}>
      <h2 className="text-xl font-bold mb-4">계정 관리</h2>
      <div className="mb-4 space-x-2">
        <button className="px-4 py-2 bg-red-500 text-white rounded" onClick={markRowAsDeleted}>
          - 삭제
        </button>
        <button className="px-4 py-2 bg-blue-500 text-white rounded" onClick={handleSave}>
          저장
        </button>
      </div>
      <div className="ag-theme-alpine" style={{ height: 500 }}>
        <AgGridReact
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onGridReady={onGridReady}
          onCellValueChanged={onCellValueChanged}
          rowSelection={{
            type: "multiple",
            checkboxes: {
              header: true,
              cell: true,
            },
          }}
          getRowId={(params) => params.data.userId}
          getRowStyle={(params) =>
            params.data.state === "D" ? { textDecoration: "line-through", background: "#fee" } : {}
          }
        />
      </div>
    </div>
  );
};

export default AccountPage;