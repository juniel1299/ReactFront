import { useEffect, useState, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import axios from "../api/axiosInstance";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

const AuthorityUserMappingPage = () => {
  const leftGridRef = useRef(null);
  const rightGridRef = useRef(null);

  const [authGroups, setAuthGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [userIdInput, setUserIdInput] = useState("");
  const [filters, setFilters] = useState({
    authGrpId: "",
    authGrpName: "",
    userId: "",
  });

  useEffect(() => {
    if (authGroups.length === 1) {
      const authGrpId = authGroups[0].authGrpId;
      axios
        .get(`/auth-group/groups/${authGrpId}/users`)
        .then((res) => setUsers(res.data));
    }
  }, [authGroups]);

  const onSearch = () => {
    axios
      .post("/auth-group/search", filters)
      .then((res) => {
        // 검색 결과가 그룹 기준으로 왼쪽 그리드에 반영됨
        setAuthGroups(res.data);
        setUsers([]); // 우측 그리드 초기화 (원하면 유지 가능)
      })
      .catch((err) => console.error("검색 실패", err));
  };

  const onGroupClick = (event) => {
    const authGrpId = event.data.authGrpId;
    axios
      .get(`/auth-group/groups/${authGrpId}/users`)
      .then((res) => setUsers(res.data))
      .catch((err) => console.error("사용자 불러오기 실패", err));
  };

  const addMapping = () => {
    if (!userIdInput) return alert("사용자 ID를 입력하세요");

    const selectedNodes = leftGridRef.current?.api?.getSelectedNodes();
    if (!selectedNodes || selectedNodes.length === 0) return alert("권한 그룹을 선택하세요");

    const newMappings = selectedNodes.map((node) => ({
      authGrpId: node.data.authGrpId,
      userId: userIdInput,
      state: "I",
    }));

    setUsers((prev) => [...prev, ...newMappings]);
    setUserIdInput("");
  };

  const handleSave = () => {
    const modified = users.filter((row) => row.state === "I" || row.state === "D");
    if (modified.length === 0) {
      alert("변경된 데이터가 없습니다.");
      return;
    }

    axios
      .post("/auth-group/save", modified)
      .then(() => {
        alert("저장 완료");
        setUsers([]);
      })
      .catch(() => alert("저장 실패"));
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 className="text-lg font-bold mb-4">권한그룹 사용자 매핑</h2>

      {/* 검색 필터 */}
      <div className="mb-4 space-x-2">
        <input
          type="text"
          placeholder="권한그룹 ID"
          value={filters.authGrpId}
          onChange={(e) => setFilters({ ...filters, authGrpId: e.target.value })}
          className="border p-1"
        />
        <input
          type="text"
          placeholder="권한그룹명"
          value={filters.authGrpName}
          onChange={(e) => setFilters({ ...filters, authGrpName: e.target.value })}
          className="border p-1"
        />
        <input
          type="text"
          placeholder="사용자 ID"
          value={filters.userId}
          onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
          className="border p-1"
        />
        <button className="bg-blue-500 text-white px-3 py-1" onClick={onSearch}>
          검색
        </button>
      </div>

      {/* 사용자 ID 직접 추가 */}
      <div className="mb-4 space-x-2">
        <input
          type="text"
          placeholder="추가할 사용자 ID"
          value={userIdInput}
          onChange={(e) => setUserIdInput(e.target.value)}
          className="border p-1"
        />
        <button className="bg-green-500 text-white px-3 py-1" onClick={addMapping}>
          추가
        </button>
        <button className="bg-blue-600 text-white px-3 py-1" onClick={handleSave}>
          저장
        </button>
      </div>

      {/* 그리드 */}
      <div className="flex gap-4">
        <div className="ag-theme-alpine" style={{ width: "45%", height: 400 }}>
          <AgGridReact
            ref={leftGridRef}
            rowData={authGroups}
            columnDefs={[
              { headerName: "권한그룹 ID", field: "authGrpId", checkboxSelection: true },
              { headerName: "권한그룹명", field: "authGrpName" },
            ]}
            rowSelection="multiple"
            onRowClicked={onGroupClick}
          />
        </div>

        <div className="ag-theme-alpine" style={{ width: "55%", height: 400 }}>
          <AgGridReact
            ref={rightGridRef}
            rowData={users}
            columnDefs={[
              { headerName: "사용자 ID", field: "userId" },
              { headerName: "권한그룹 ID", field: "authGrpId" },
              { headerName: "상태", field: "state" },
            ]}
            rowSelection="multiple"
            getRowStyle={(params) =>
              params.data.state === "I"
                ? { backgroundColor: "#dff0d8" }
                : params.data.state === "D"
                ? { textDecoration: "line-through", backgroundColor: "#f2dede" }
                : {}
            }
          />
        </div>
      </div>
    </div>
  );
};

export default AuthorityUserMappingPage;