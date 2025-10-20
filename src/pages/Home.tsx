import { Link } from "react-router-dom"
function HomePage() {
    return (
        <div className="flex ">
            <Link to={"/admin"}>Admin</Link>

        </div>
    )
}
export default HomePage

