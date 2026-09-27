package model;

public class Unidad {

    private String placa;
    private String modelo;
    private int capacidad;
    private boolean disponible;

    public Unidad(String placa, String modelo, int capacidad, boolean disponible) {
        this.placa = placa;
        this.modelo = modelo;
        this.capacidad = capacidad;
        this.disponible = disponible;

    }

    //Validacion de datos de la unidad
    public boolean validarDatos(){
        boolean resultplaca = true;
        boolean resultmodelo = true;
        boolean resultcapacidad = true;

        if (this.placa == null || this.placa.length() != 7) {
            resultplaca = false;
        } else if (this.placa.charAt(0) != '0' || this.placa.charAt(1) != '1' || this.placa.charAt(4) != '2' || this.placa.charAt(6) != 'A') {
            resultplaca = false;
        }
        
        if (this.modelo == null || this.modelo.trim().isEmpty()) {
            resultmodelo = false;
        }

        if (this.capacidad <= 0) {
            resultcapacidad = false;
        }

        return resultplaca && resultmodelo && resultcapacidad;
    }

    // Getters and Setters
    public String getPlaca() {
        return this.placa;
    }

    public String getModelo() {
        return this.modelo;
    }

    public int getCapacidad() {
        return this.capacidad;
    }

    public boolean isDisponible() {
        return this.disponible;
    }

    public void setPlaca(String placa) {
        this.placa = placa;
    }

    public void setModelo(String modelo) {
        this.modelo = modelo;
    }

    public void setCapacidad(int capacidad) {
        this.capacidad = capacidad;
    }

    public void setDisponible(boolean disponible) {
        this.disponible = disponible;
    }
}
