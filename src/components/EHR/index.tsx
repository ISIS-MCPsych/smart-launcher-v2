import { useSearchParams }        from "react-router-dom"
import { useEffect, useState, useRef }    from "react"
import { Helmet, HelmetProvider } from "react-helmet-async"
import FHIR from "fhirclient"
import getPHQ9Order from "./phq9-order"
import { formatAge, humanName }   from "../../lib"
import "./style.css"
import orderables from "./orderables.json";


export default function EHR() {
    const [searchParams] = useSearchParams()
    const [user, setUser] = useState<fhir4.Patient | fhir4.Practitioner | null>(null)
    const [patient, setPatient] = useState<fhir4.Patient | null>(null)
    const [encounterID, setEncounterID] = useState<string>("Unknown")
    const [selectedItems, setSelectedItems] = useState<{ tests: string[]; treatments: string[] }>({
        tests: [],
        treatments: []
    })
    const orderDialogRef = useRef<HTMLDialogElement>(null)

    const fhirClient = FHIR.client({
        serverUrl: "http://localhost:4004/fhir/",
        clientId: "my-client-id",
        scope: "launch/patient patient/*.read user/*.read offline_access openid fhirUser"
    })

    const handleOrderClick = () => {
        orderDialogRef.current?.showModal()
    }

    const handleCloseOrder = () => {
        orderDialogRef.current?.close()
    }

    const handleCheckboxChange = (category: "tests" | "treatments", item: string) => {
        setSelectedItems((prev) => {
            const updatedCategory = prev[category].includes(item)
                ? prev[category].filter((i) => i !== item)
                : [...prev[category], item];
            return { ...prev, [category]: updatedCategory };
        });
    };

    const orderPHQ9 = async () => {
        const order = getPHQ9Order(patient?.id || "", user?.id || "")
        await fhirClient.create(order)
            .then((response) => {
                console.log("PHQ-9 order created:", order)
            }
            ).catch((error) => {
                console.error("Error creating PHQ-9 order:", error)
            })
        handleCloseOrder()
    }

    useEffect(() => {
        function onMessage(event: MessageEvent) {
            if (event.origin === window.location.origin) {
                switch (event.data.type) {
                    case "setUser":
                        setUser(event.data.payload);
                    break;
                    case "setPatient":
                        setPatient(event.data.payload);
                    break;
                    case "setEncounterID":
                        setEncounterID(event.data.payload);
                    break;
                    default:
                        console.warn("Invalid post message:", event);
                    break;
                }
            }
        }

        window.addEventListener("message", onMessage, false);

        return () => window.removeEventListener("message", onMessage, false);
    }, [])

    const launchUrl = searchParams.get("app")

    if (!launchUrl) {
        return (
            <div className="ehr">
                <div className="alert alert-danger">
                    An "app" URL parameter is required
                </div>
            </div>
        )
    }

    let patientID   = patient?.id ?? "Unknown"
    let userID      = user?.id ?? "Unknown"
    let patientName = patient ? humanName(patient) : "Unknown"
    let patientAge  = patient && patient.birthDate ? formatAge(patient) || "Unknown" : "Unknown"
    let patientSex  = patient?.gender || "Unknown"
    let userName    = user ? humanName(user) : "Unknown"

    return (
        <HelmetProvider>
            <Helmet>
                <title>SMART Launcher - EHR View</title>
            </Helmet>
            <div className="ehr">
                <div className="ehr-header">
                    <div className="flex-row">
                        <div className="logo">
                            <img src="/logo.png" alt="SMART Logo" /> Simulated EHR
                        </div>
                        <div>
                            <i className="glyphicon glyphicon-user"/>&nbsp;
                            patient: <b>{ patientName }</b>,
                            age: <b>{ patientAge }</b>{patient?.deceasedBoolean || patient?.deceasedDateTime ? " (deceased)" : ""},
                            sex: <b>{ patientSex }</b>
                        </div>
                        <div>
                            <i className="glyphicon glyphicon-user"/>&nbsp;
                            user: <b>{ userName }</b>
                        </div>
                    </div>
                </div>
                <div className="ehr-main-row">
                    <div className="ehr-sidebar">
                        <h3>EHR Sidebar</h3>
                    </div>
                    <iframe
                        name="iframe"
                        id="frame"
                        title="EHR Frame"
                        src={launchUrl + ""}
                        sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-downloads"
                        allow="microphone *; camera *">
                    </iframe>
                    <div className="ehr-sidebar">
                        <h3>EHR Sidebar</h3>
                    </div>
                </div>
                <div className="ehr-status-bar">
                    <div className="flex-row">
                        <div className="text-muted" style={{ flex: "0 1 auto" }}>EHR Status bar</div>
                        <div>Patient ID: { patientID }</div>
                        <div>User ID: { userID }</div>
                        <div>Encounter ID: { encounterID }</div>
                        <button 
                            className="btn btn-primary" 
                            style={{ margin: "0.5em auto" }} 
                            onClick={handleOrderClick}>
                            Order
                        </button>
                    </div>
                </div>
            </div>

            <dialog ref={orderDialogRef} className="order-dialog">
                <h3>Place Order</h3>
                <p>Select the tests and treatments to order for the patient.</p>
                <form>
                    <div>
                        <h4>Tests</h4>
                        {orderables.tests.map((test) => (
                            <div className="form-check" key={test}>
                                <label className="form-check-label">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={selectedItems.tests.includes(test)}
                                        onChange={() => handleCheckboxChange("tests", test)}
                                    />
                                    {test}
                                </label>
                            </div>
                        ))}
                    </div>
                    <div>
                        <h4>Treatments</h4>
                        {orderables.treatments.map((treatment) => (
                            <div className="form-check" key={treatment}>
                                <label className="form-check-label">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={selectedItems.treatments.includes(treatment)}
                                        onChange={() => handleCheckboxChange("treatments", treatment)}
                                    />
                                    {treatment}
                                </label>
                            </div>
                        ))}
                    </div>
                    <button
                        className="btn btn-secondary" 
                        onClick={handleCloseOrder}>
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        onClick={orderPHQ9}>
                        Order
                    </button>
                </form>
            </dialog>
        </HelmetProvider>
    )
}