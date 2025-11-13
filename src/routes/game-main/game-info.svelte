<script lang="ts">
    import { getPetInfo, petInfo, type UserPetInfo } from "$lib/services/game.svelte";

    const { level: petLevel = NaN, aimValue = NaN, growthValue = NaN } = $derived(petInfo.isLegal ? petInfo : {} as Partial<UserPetInfo>);

    $effect(() => {
        getPetInfo();
    });
</script>
<style>
    /* .info {
        grid-area: 1 / 1 / 2 / 3;
        justify-self: flex-start;
        
        display: grid;
        grid: auto / subgrid;

        pointer-events: all;
    } */

    .level-container {
        display: flex;
        margin-right: -2rem;
        margin-bottom: -2rem;
    }

    .level {
        width: 0;
        flex-grow: 1;

        flex-grow: 1;
        padding: .25rem;
        background-color: #c86e00;
        border: .25rem solid #ffaa43;
        border-radius: .25rem;

        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: .25rem;

        .label {
            font-size: 1rem;
            font-weight: bolder;
        }

        .value {            
            margin: auto 0;

            font-size: 2rem;
            font-weight: bold;
            line-height: 1;
        }

        .progress-bar {
            width: 100%;
            background-color: #925000;
            height: .5rem;
            border-radius: .125rem;
            margin: .5rem 0;

            position: relative;

            .progress-label {
                width: 100%;

                text-align: center;
                font-size: 1rem;
                font-weight: bold;
                color: black;
                line-height: 1;
                
                position: absolute;
                top: 50%;
                left: 0;

                transform: translateY(-50%);
            }

            .progress {
                height: 100%;
                background-color: #ffff00;
                border-radius: .125rem 0 0 .125rem;
                
                position: absolute;
                top: 0;
                left: 0;
            }
        }
    }
</style>

<!-- <div class="info"> -->
    <div class="level-container">
        <div class="level">
            <span class="label">LEVEL</span>
            <span class="value">{ petLevel }</span>
            <span class="progress-bar">
                <span class="progress" style="width: {growthValue / aimValue * 100}%;"></span>
                <span class="progress-label">{ growthValue } / { aimValue }</span>
            </span>
        </div>
    </div>
<!-- </div> -->
