import { useEffect, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { useNavigate } from "react-router-dom";
import axios from "../api/axiosInstance"; // ✅ axios 인스턴스

const AccountPage = () => {
    const gridRef = useRef();
    const [rowData, setRowData] = useState([]);
    const navigate = useNavigate();

    // 관리자 권한 확인
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user || user.role !== "ROLE_ADMIN") {
            alert("접근 권한이 없습니다.");
            navigate("/");
        }
    }, []);

    const columnDefs = [
        { headerName: "아이디", field: "USER_ID", editable: false },
        { headerName: "이름", field: "USERNAME", editable: true },
        { headerName: "권한", field: "ROLE", editable: true },
        { headerName: "언어", field: "LOCALE", editable: true },
        { headerName: "사용여부", field: "USE_YN", editable: true },
        { headerName: "전화번호", field: "PHONE", editable: true },
        { headerName: "이메일", field: "EMAIL", editable: true },
    ];

    useEffect(() => {
        axios.get("/admin/users")
            .then((res) => setRowData(res.data))
            .catch((err) => console.error("불러오기 실패", err));
    }, []);

    const handleSave = () => {
        const updatedRows = [];
        gridRef.current.api.forEachNode((node) => {
            updatedRows.push(node.data);
        });

        axios.post("/admin/users", updatedRows)
            .then(() => alert("저장 완료"))
            .catch(() => alert("저장 실패"));
    };

    const handleDelete = () => {
        const selectedNodes = gridRef.current.api.getSelectedNodes();
        const selectedData = selectedNodes.map((node) => node.data);

        selectedData.forEach((row) => {
            axios.delete(`/admin/users/${row.USER_ID}`)
                .then(() => {
                    setRowData((prev) => prev.filter(user => user.USER_ID !== row.USER_ID));
                })
                .catch(() => alert("삭제 실패"));
        });
    };

    return (
        <div style={{ padding: "20px" }}>
            <h2 className="text-xl font-bold mb-4">계정 관리</h2>
            <div className="mb-4 space-x-2">
                <button className="px-4 py-2 bg-blue-500 text-white rounded" onClick={handleSave}>
                    저장
                </button>
                <button className="px-4 py-2 bg-red-500 text-white rounded" onClick={handleDelete}>
                    삭제
                </button>
            </div>

            <div className="ag-theme-alpine" style={{ height: 500, width: "100%" }}>
                <AgGridReact
                    rowData={rowData}
                    columnDefs={columnDefs}
                    defaultColDef={{ editable: true }}
                />
            </div>
        </div>
    );
};

export default AccountPage;