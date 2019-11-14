# Export a Cinema Database from ParaView 5.7 using the Nyx Tutorial Dataset


## Workflow

### Setup ParaView GUI with the dataset

- Clone the tutorial repository:
   - git clone https://github.com/cinemascience/cinema_tutorial_2019-11_SC.git
- Open ParaView 5.7.1 GUI
- Select **File** -> **Load State** command
- Navigate to the cinema_tutorial_2019-11_SC directory and select loadNyxDataset.pvsm state file.  
- For the **Load State Options**, you will need to choose **Search files under specified directory** and navigate to the nyxTutorialDataset/ folder to select **nyx.pvd**.
- In the **Pipeline Browser**, click to highlight **nxy.pvd**

### Setup and export the Cinema database

- Under **View**, select **Export Inspector**  (if needed)
- Select **Export Inspector** tab
- Under **Image Extracts**, select the choices from the dropdown menus:

```
RenderView1         Cinema image database (*.cdb)
```

- Click on the checkbox to establish these choices
- Click on the ellipsis menu to bring up the **Save Screenshot Options** menu
- Use **Camera Model** dropdown menu to select **Phi-Theta**

Update the path under **Root Directory** to point to the expected output directory:

```
/<path-to-repo>/cinema_tutorial_2019-11_SC/materials/data/nyx.cdb
````

Select **File** -> **Export Now** to export the Cinema Database.

You can watch the **Time** counter at the top.  There are 5 timesteps (0 to 4).  When the timestep counter gets to four and the frame resets, the export will be finished.  


### View the nyx.cdb in the CinemaCompare viewer

Open CinemaCompare in Firefox:

```
$ firefox materials/cinema_compare.html
```

If you do not want to run the workflow, you can still look at an example database:
```
$ firefox materials/example_compare.html
```

Use the sliders to explore the Nyx Cinema Database.  


### Acknowledgement

This tutorial uses a dataset from the open source Nyx cosmology simulation:

A. S. Almgren, J. B. Bell, M.J. Lijewski, Z. Lukic, E. Van Andel, "Nyx: A Massively Parallel AMR Code for Computational Cosmology" Astrophysical Journal, 765, 39, 2013.  https://amrex-astro.github.io/Nyx/index.html
