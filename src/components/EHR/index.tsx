import { useSearchParams }        from "react-router-dom"
import { useEffect, useState, useRef }    from "react"
import { Helmet, HelmetProvider } from "react-helmet-async"
import FHIR from "fhirclient"
import { createOrder, availableTests, availableTreatments } from "./order-factory"
import { formatAge, humanName }   from "../../lib"
import { decode } from "../../isomorphic/codec"
import "./style.css"


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

    const launchUrl = searchParams.get("app")

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

    const submitOrders = async (e?: React.MouseEvent) => {
        e?.preventDefault()
        
        const patientId = patient?.id || ""
        const providerId = user?.id || ""
        
        if (!patientId || !providerId) {
            console.error("Missing patient ID or provider ID")
            return
        }

        const allOrders: Array<{ type: 'test' | 'treatment', item: string }> = [
            ...selectedItems.tests.map(test => ({ type: 'test' as const, item: test })),
            ...selectedItems.treatments.map(treatment => ({ type: 'treatment' as const, item: treatment }))
        ]

        if (allOrders.length === 0) {
            console.warn("No items selected to order")
            handleCloseOrder()
            return
        }

        try {
            const orderPromises = allOrders.map(async ({ type, item }) => {
                const order = createOrder(type, item, patientId, providerId)
                const response = await fhirClient.create(order)
                console.log(`${type} order created for "${item}":`, response)
                return response
            })

            await Promise.all(orderPromises)
            console.log(`Successfully created ${allOrders.length} orders`)
            
            // Clear selected items after successful submission
            setSelectedItems({ tests: [], treatments: [] })
        } catch (error) {
            console.error("Error creating orders:", error)
        }
        
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

    // Extract and decode launch parameters from app URL to get pre-selected patient/provider
    useEffect(() => {
        if (!launchUrl) return

        try {
            const appUrl = new URL(launchUrl)
            const launchParam = appUrl.searchParams.get("launch")
            
            if (launchParam) {
                const launchOptions = decode(launchParam)
                console.log("Decoded launch options:", launchOptions)
                
                // If we have pre-selected patient/provider IDs, fetch them from FHIR
                if (launchOptions.patient) {
                    const patientIds = launchOptions.patient.split(',').map(id => id.trim()).filter(Boolean)
                    if (patientIds.length === 1) {
                        // Fetch the patient data
                        fhirClient.request(`Patient/${patientIds[0]}`)
                            .then((patient: fhir4.Patient) => {
                                console.log("Fetched pre-selected patient:", patient)
                                setPatient(patient)
                            })
                            .catch((err: any) => console.error("Failed to fetch patient:", err))
                    }
                }
                
                if (launchOptions.provider) {
                    const providerIds = launchOptions.provider.split(',').map(id => id.trim()).filter(Boolean)
                    if (providerIds.length === 1) {
                        // Fetch the provider data
                        fhirClient.request(`Practitioner/${providerIds[0]}`)
                            .then((practitioner: fhir4.Practitioner) => {
                                console.log("Fetched pre-selected provider:", practitioner)
                                setUser(practitioner)
                            })
                            .catch((err: any) => console.error("Failed to fetch provider:", err))
                    }
                }
                
                if (launchOptions.encounter && launchOptions.encounter !== "AUTO" && launchOptions.encounter !== "MANUAL" && launchOptions.encounter !== "NONE") {
                    console.log("Setting pre-selected encounter ID:", launchOptions.encounter)
                    setEncounterID(launchOptions.encounter)
                }
            }
        } catch (error) {
            console.error("Failed to decode launch parameters:", error)
        }
    }, [searchParams])

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
                        {availableTests.map((test) => (
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
                        {availableTreatments.map((treatment) => (
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
                        type="button"
                        onClick={handleCloseOrder}>
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        onClick={submitOrders}
                        disabled={selectedItems.tests.length === 0 && selectedItems.treatments.length === 0}>
                        Order ({selectedItems.tests.length + selectedItems.treatments.length} Items)
                    </button>
                </form>
            </dialog>
        </HelmetProvider>
    )
}